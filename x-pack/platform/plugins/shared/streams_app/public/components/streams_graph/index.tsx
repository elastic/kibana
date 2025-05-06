/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  CSSProperties,
  createContext,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { isEqual } from 'lodash';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { StreamDefinition, isGroupStreamDefinition } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

cytoscape.use(dagre);

export function StreamsGraph({
  streams,
  currentStream,
}: {
  streams?: Array<{ stream: StreamDefinition }>;
  currentStream?: StreamDefinition;
}) {
  const router = useStreamsAppRouter();

  const onNodeClick = useCallback(
    (id: string) => {
      router.push('/{key}', {
        path: { key: id },
        query: {},
      });
    },
    [router]
  );

  return <Cytoscape elements={buildGraph(streams, currentStream)} onNodeClick={onNodeClick} />;
}

function buildGraph(
  streams?: Array<{ stream: StreamDefinition }>,
  currentStream?: StreamDefinition
): cytoscape.ElementDefinition[] {
  if (!streams) {
    return [];
  }

  if (!currentStream) {
    return streams.flatMap((stream) => {
      if (!isGroupStreamDefinition(stream.stream)) {
        return [
          {
            data: {
              id: stream.stream.name,
              label: stream.stream.name,
              type: 'ingest',
            },
          },
        ];
      }

      return [
        {
          data: {
            id: stream.stream.name,
            label: stream.stream.name,
            type: 'group',
          },
        },
        ...stream.stream.group.relationships.map((relationship) => {
          return {
            data: {
              source: stream.stream.name,
              target: relationship.name,
            },
          };
        }),
      ];
    });
  }

  const relevantStreams = streams.filter((stream) => {
    if (stream.stream.name === currentStream.name) {
      return true;
    }

    if (isGroupStreamDefinition(stream.stream)) {
      if (
        stream.stream.group.relationships
          .map((relationship) => relationship.name)
          .includes(currentStream.name)
      ) {
        return true;
      }
    }

    if (isGroupStreamDefinition(currentStream)) {
      if (
        currentStream.group.relationships
          .map((relationship) => relationship.name)
          .includes(stream.stream.name)
      ) {
        return true;
      }
    }
  });

  return relevantStreams.flatMap((stream) => {
    if (!isGroupStreamDefinition(stream.stream)) {
      return [
        {
          data: {
            id: stream.stream.name,
            label: stream.stream.name,
            type: 'ingest',
            current: currentStream.name === stream.stream.name,
          },
        },
      ];
    }

    return [
      {
        data: {
          id: stream.stream.name,
          label: stream.stream.name,
          type: 'group',
          current: currentStream.name === stream.stream.name,
        },
      },
      ...stream.stream.group.relationships
        .filter((relationship) => {
          return relevantStreams.find(
            (relevantStream) => relevantStream.stream.name === relationship.name
          );
        })
        .map((relationship) => {
          return {
            data: {
              source: stream.stream.name,
              target: relationship.name,
            },
          };
        }),
    ];
  });
}

const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevElementIds = prevProps.elements.map((element) => element.data.id).sort();
  const nextElementIds = nextProps.elements.map((element) => element.data.id).sort();
  const propsAreEqual = isEqual(prevElementIds, nextElementIds);
  return propsAreEqual;
});

const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

interface CytoscapeProps {
  elements: cytoscape.ElementDefinition[];
  onNodeClick: (id: string) => void;
}

function CytoscapeComponent({ elements, onNodeClick }: CytoscapeProps) {
  const { euiTheme } = useEuiTheme();

  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(euiTheme),
    elements,
  });
  useCytoscapeEventHandlers({ cy, euiTheme, onNodeClick });

  useEffect(() => {
    if (cy && elements.length > 0) {
      cy.add(elements);

      const elementIds = elements.map((element) => element.data.id);
      cy.elements().forEach((element) => {
        if (!elementIds.includes(element.data('id'))) {
          cy.remove(element);
        } else {
          const newElement = elements.find((el) => el.data.id === element.id());
          element.data(newElement?.data ?? element.data());
        }
      });

      const fit = true;
      cy.trigger('custom:data', [fit]);
    }
  }, [cy, elements]);

  const style = {
    ...getCytoscapeDivStyle(euiTheme),
    height: '800px',
  };

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={style} />
    </CytoscapeContext.Provider>
  );
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    }
  }, [options, cy]);

  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}

function useCytoscapeEventHandlers({
  cy,
  euiTheme,
  onNodeClick,
}: {
  cy?: cytoscape.Core;
  euiTheme: EuiThemeComputed;
  onNodeClick: (id: string) => void;
}) {
  useEffect(() => {
    const dataHandler: cytoscape.EventHandler = (event) => {
      const options = {
        fit: true,
        name: 'dagre',
        padding: 40,
        spacingFactor: 1.2,
        nodeSep: 40,
        edgeSep: 32,
        rankSep: 128,
        rankDir: 'LR',
        ranker: 'network-simplex',
      } as cytoscape.LayoutOptions;

      event.cy.layout(options).run();
    };

    const tapHandler: cytoscape.EventHandler = (event) => {
      if (event.target && event.target.isNode && event.target.isNode()) {
        onNodeClick(event.target.id());
      }
    };

    if (cy) {
      cy.on('custom:data', dataHandler);
      cy.on('tap', tapHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('custom:data', dataHandler);
      }
    };
  }, [cy, euiTheme, onNodeClick]);
}

const getCytoscapeDivStyle = (euiTheme: EuiThemeComputed): CSSProperties => ({
  background: `linear-gradient(
  90deg,
  ${euiTheme.colors.backgroundBasePlain}
    calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${euiTheme.colors.backgroundBasePlain}
    calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
  transparent 1%
)
center,
${euiTheme.colors.lightShade}`,
  backgroundSize: `${euiTheme.size.l} ${euiTheme.size.l}`,
});

const getCytoscapeOptions = (euiTheme: EuiThemeComputed): cytoscape.CytoscapeOptions => ({
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  style: getStyle(euiTheme),
});

const getStyle = (euiTheme: EuiThemeComputed): cytoscape.StylesheetJson => {
  return [
    {
      selector: 'node',
      style: {
        shape: (el: cytoscape.NodeSingular) => (el.data('type') === 'group' ? 'ellipse' : 'barrel'),
        'background-color': euiTheme.colors.backgroundBasePlain,
        'background-height': '40%',
        'background-width': '40%',
        'border-color': (el: cytoscape.NodeSingular) =>
          el.data('current') ? euiTheme.colors.accent : euiTheme.colors.mediumShade,
        'border-style': 'solid',
        'border-width': 4,
        color: euiTheme.colors.textParagraph,
        'font-size': euiTheme.size.s,
        label: (el: cytoscape.NodeSingular) => el.data('label'),
        'text-margin-y': 45,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': euiTheme.colors.mediumShade,
        'curve-style': 'unbundled-bezier',
        'source-arrow-shape': 'none',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': euiTheme.colors.mediumShade,
        // @ts-expect-error
        'target-distance-from-node': euiTheme.size.xs,
      },
    },
  ];
};

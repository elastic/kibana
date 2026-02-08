/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
} from '@elastic/eui';
import type {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core/public';
import type { GpuChartsExpressionProps } from './expression';
import type { GpuColumnarData, GpuCapabilities } from './types';
import { GPU_CHARTS_RENDERER, CHART_SHAPES } from './constants';
import { detectGpuCapabilities, isGpuRenderingSupported } from './gpu_capabilities';
import { datatableToColumnar, normalizeColumnarData } from './columnar_data';
import { selectLodTier } from './lod_selection';
import { GpuChartsToolbar, type ToolbarState } from './toolbar';

// Types for deck.gl - we import dynamically to avoid babel runtime issues
interface DeckInstance {
  setProps: (props: Record<string, unknown>) => void;
  finalize: () => void;
}

interface GpuChartsRendererDeps {
  core: CoreStart;
}

export const getGpuChartsRenderer = ({
  core,
}: GpuChartsRendererDeps): ExpressionRenderDefinition<GpuChartsExpressionProps> => ({
  name: GPU_CHARTS_RENDERER,
  displayName: i18n.translate('xpack.lens.gpuCharts.rendererDisplayName', {
    defaultMessage: 'GPU Charts',
  }),
  help: i18n.translate('xpack.lens.gpuCharts.rendererHelp', {
    defaultMessage: 'Renders GPU-accelerated visualizations',
  }),
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: GpuChartsExpressionProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    ReactDOM.render(
      <KibanaRenderContextProvider {...core}>
        <GpuChartComponent config={config} handlers={handlers} />
      </KibanaRenderContextProvider>,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});

interface GpuChartComponentProps {
  config: GpuChartsExpressionProps;
  handlers: IInterpreterRenderHandlers;
}

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  lodTier: 1,
  autoLod: true,
  pointSize: 5,
  pointOpacity: 0.8,
  hexagonRadius: 1000,
  hexagonElevationScale: 1,
  showAxes: true,
  enableRotation: true,
};

function GpuChartComponent({ config, handlers }: GpuChartComponentProps) {
  const { data, args } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<DeckInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnarData, setColumnarData] = useState<GpuColumnarData | null>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    ...DEFAULT_TOOLBAR_STATE,
    pointSize: args.pointSize ?? DEFAULT_TOOLBAR_STATE.pointSize,
    pointOpacity: args.pointOpacity ?? DEFAULT_TOOLBAR_STATE.pointOpacity,
    hexagonRadius: args.hexagonRadius ?? DEFAULT_TOOLBAR_STATE.hexagonRadius,
    hexagonElevationScale:
      args.hexagonElevationScale ?? DEFAULT_TOOLBAR_STATE.hexagonElevationScale,
  });

  // Detect GPU capabilities
  const capabilities = useMemo(() => detectGpuCapabilities(), []);

  // LOD selection based on data size and toolbar state
  const lodSelection = useMemo(() => {
    if (toolbarState.autoLod) {
      return selectLodTier(data.rows.length);
    }
    return selectLodTier(data.rows.length, {
      tier: toolbarState.lodTier,
    });
  }, [data.rows.length, toolbarState.autoLod, toolbarState.lodTier]);

  // Handle toolbar state changes
  const handleToolbarChange = useCallback((changes: Partial<ToolbarState>) => {
    setToolbarState((prev) => ({ ...prev, ...changes }));
  }, []);

  // Reset camera callback
  const handleResetCamera = useCallback(() => {
    if (deckRef.current) {
      deckRef.current.setProps({
        initialViewState: {
          longitude: 0,
          latitude: 0,
          zoom: 1,
          pitch: 45,
          bearing: 0,
        },
      });
    }
  }, []);

  // Convert data to columnar format
  useEffect(() => {
    if (!isGpuRenderingSupported()) {
      setError('WebGL2 is not available. GPU-accelerated charts cannot be rendered.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Convert to columnar format with sampling if needed
      const columnar = datatableToColumnar(
        data,
        {
          x: args.xAccessor,
          y: args.yAccessor,
          z: args.zAccessor,
          color: args.colorAccessor,
          size: args.sizeAccessor,
          group: args.groupAccessor,
        },
        {
          maxPoints: lodSelection.estimatedRenderPoints,
          samplingRate: lodSelection.samplingRate,
        }
      );

      // Normalize for GPU rendering
      normalizeColumnarData(columnar);

      setColumnarData(columnar);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process data');
      setIsLoading(false);
    }
  }, [data, args, lodSelection]);

  // Render error state
  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.lens.gpuCharts.errorTitle', {
          defaultMessage: 'Unable to render GPU chart',
        })}
        color="danger"
        iconType="error"
      >
        <p>{error}</p>
      </EuiCallOut>
    );
  }

  // Render loading state
  if (isLoading || !columnarData) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Render warning for WebGL with performance caveat
  const performanceWarning = capabilities.hasPerformanceCaveat ? (
    <EuiCallOut
      title={i18n.translate('xpack.lens.gpuCharts.performanceCaveatTitle', {
        defaultMessage: 'Software rendering detected',
      })}
      color="warning"
      iconType="warning"
      size="s"
    >
      <p>
        {i18n.translate('xpack.lens.gpuCharts.performanceCaveatDescription', {
          defaultMessage:
            'WebGL is using software rendering. Performance may be degraded for large datasets.',
        })}
      </p>
    </EuiCallOut>
  ) : null;

  // Render the chart
  return (
    <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%' }}>
      {performanceWarning && <EuiFlexItem grow={false}>{performanceWarning}</EuiFlexItem>}

      {/* Sampling indicator */}
      {lodSelection.samplingRate < 1 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.lens.gpuCharts.sampledBadge', {
                  defaultMessage: 'Sampled: {percent}%',
                  values: { percent: Math.round(lodSelection.samplingRate * 100) },
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {lodSelection.reason}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {/* Toolbar */}
      <EuiFlexItem grow={false}>
        <GpuChartsToolbar
          state={toolbarState}
          onChange={handleToolbarChange}
          onResetCamera={handleResetCamera}
          chartType={args.shape === CHART_SHAPES.SCATTER_3D ? 'scatter3d' : 'hexagon'}
          dataPointCount={data.rows.length}
        />
      </EuiFlexItem>

      {/* Chart container */}
      <EuiFlexItem grow>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: 300,
            position: 'relative',
          }}
        >
          {args.shape === CHART_SHAPES.SCATTER_3D ? (
            <Scatter3DChart
              data={columnarData}
              args={args}
              capabilities={capabilities}
              containerRef={containerRef}
              deckRef={deckRef}
              toolbarState={toolbarState}
            />
          ) : (
            <HexagonChart
              data={columnarData}
              args={args}
              capabilities={capabilities}
              containerRef={containerRef}
              deckRef={deckRef}
              toolbarState={toolbarState}
            />
          )}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/**
 * 3D Scatter Plot using deck.gl ScatterplotLayer
 */
function Scatter3DChart({
  data,
  args,
  capabilities,
  containerRef,
  deckRef,
  toolbarState,
}: {
  data: GpuColumnarData;
  args: GpuChartsExpressionProps['args'];
  capabilities: GpuCapabilities;
  containerRef: React.RefObject<HTMLDivElement>;
  deckRef: React.MutableRefObject<DeckInstance | null>;
  toolbarState: ToolbarState;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let deck: DeckInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Dynamically import deck.gl modules to avoid babel runtime issues
    const loadDeckGl = async () => {
      try {
        const [{ Deck }, { ScatterplotLayer }] = await Promise.all([
          import('@deck.gl/core'),
          import('@deck.gl/layers'),
        ]);

        if (!containerRef.current || !canvasRef.current) return;

        // Prepare data for ScatterplotLayer
        const scatterData: Array<{
          position: [number, number, number];
          color: [number, number, number, number];
          radius: number;
        }> = [];

        for (let i = 0; i < data.length; i++) {
          const x = data.x ? data.x[i] : 0;
          const y = data.y ? data.y[i] : 0;
          const z = data.z ? data.z[i] : 0;

          let color: [number, number, number, number] = [
            66,
            133,
            244,
            Math.round(toolbarState.pointOpacity * 255),
          ];
          if (data.color && data.bounds.color) {
            const colorValue = data.color[i];
            const normalizedColor =
              (colorValue - (data.bounds.color.min ?? 0)) /
              ((data.bounds.color.max ?? 1) - (data.bounds.color.min ?? 0));
            color = [
              Math.round(normalizedColor * 255),
              Math.round((1 - Math.abs(normalizedColor - 0.5) * 2) * 100),
              Math.round((1 - normalizedColor) * 255),
              Math.round(toolbarState.pointOpacity * 255),
            ];
          }

          let radius = toolbarState.pointSize;
          if (data.size && data.bounds.size) {
            const sizeValue = data.size[i];
            const normalizedSize =
              (sizeValue - (data.bounds.size.min ?? 0)) /
              ((data.bounds.size.max ?? 1) - (data.bounds.size.min ?? 0));
            radius = toolbarState.pointSize * (0.5 + normalizedSize);
          }

          scatterData.push({ position: [x, y, z], color, radius });
        }

        deck = new Deck({
          canvas: canvasRef.current,
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          controller: toolbarState.enableRotation ? { dragRotate: true } : { dragRotate: false },
          initialViewState: {
            longitude: 0,
            latitude: 0,
            zoom: 1,
            pitch: 45,
            bearing: 0,
          },
          layers: [
            new ScatterplotLayer({
              id: 'scatter-layer',
              data: scatterData,
              getPosition: (d: (typeof scatterData)[0]) => d.position,
              getRadius: (d: (typeof scatterData)[0]) => d.radius,
              getFillColor: (d: (typeof scatterData)[0]) => d.color,
              radiusScale: 1,
              radiusMinPixels: 1,
              radiusMaxPixels: 100,
              pickable: true,
            }),
          ],
          getTooltip: ({ object }: { object?: (typeof scatterData)[0] }) => {
            if (!object) return null;
            return {
              html: `<div>Position: (${object.position[0].toFixed(2)}, ${object.position[1].toFixed(
                2
              )}, ${object.position[2].toFixed(2)})</div>`,
              style: {
                backgroundColor: '#1a1a2e',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
              },
            };
          },
        }) as DeckInstance;

        deckRef.current = deck;
        setDeckLoaded(true);

        resizeObserver = new ResizeObserver(() => {
          if (containerRef.current && deck) {
            deck.setProps({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            });
          }
        });
        resizeObserver.observe(containerRef.current);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load deck.gl');
      }
    };

    loadDeckGl();

    return () => {
      resizeObserver?.disconnect();
      deck?.finalize();
      deckRef.current = null;
    };
  }, [data, args, toolbarState, containerRef, deckRef]);

  if (loadError) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiText color="danger">{loadError}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {!deckLoaded && (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a2e',
        }}
      />
    </>
  );
}

/**
 * Hexagonal Density Chart using deck.gl HexagonLayer
 */
function HexagonChart({
  data,
  args,
  capabilities,
  containerRef,
  deckRef,
  toolbarState,
}: {
  data: GpuColumnarData;
  args: GpuChartsExpressionProps['args'];
  capabilities: GpuCapabilities;
  containerRef: React.RefObject<HTMLDivElement>;
  deckRef: React.MutableRefObject<DeckInstance | null>;
  toolbarState: ToolbarState;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let deck: DeckInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Dynamically import deck.gl modules to avoid babel runtime issues
    const loadDeckGl = async () => {
      try {
        const [{ Deck }, { HexagonLayer }] = await Promise.all([
          import('@deck.gl/core'),
          import('@deck.gl/aggregation-layers'),
        ]);

        if (!containerRef.current || !canvasRef.current) return;

        // Prepare data for HexagonLayer
        const hexData: Array<{ position: [number, number]; weight: number }> = [];

        for (let i = 0; i < data.length; i++) {
          const x = data.x ? data.x[i] : 0;
          const y = data.y ? data.y[i] : 0;

          let weight = 1;
          if (data.size && data.bounds.size) {
            const sizeValue = data.size[i];
            weight =
              (sizeValue - (data.bounds.size.min ?? 0)) /
                ((data.bounds.size.max ?? 1) - (data.bounds.size.min ?? 0)) +
              0.1;
          }

          hexData.push({ position: [x, y], weight });
        }

        const colorRange: Array<[number, number, number]> = [
          [68, 1, 84],
          [72, 40, 120],
          [62, 74, 137],
          [49, 104, 142],
          [38, 130, 142],
          [31, 158, 137],
          [53, 183, 121],
          [109, 205, 89],
          [180, 222, 44],
          [253, 231, 37],
        ];

        deck = new Deck({
          canvas: canvasRef.current,
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          controller: toolbarState.enableRotation ? { dragRotate: true } : { dragRotate: false },
          initialViewState: {
            longitude: 0,
            latitude: 0,
            zoom: 1,
            pitch: 45,
            bearing: 0,
          },
          layers: [
            new HexagonLayer({
              id: 'hexagon-layer',
              data: hexData,
              getPosition: (d: (typeof hexData)[0]) => d.position,
              getElevationWeight: (d: (typeof hexData)[0]) => d.weight,
              getColorWeight: (d: (typeof hexData)[0]) => d.weight,
              elevationScale: toolbarState.hexagonElevationScale * 100,
              radius: toolbarState.hexagonRadius,
              coverage: 0.9,
              extruded: true,
              pickable: true,
              colorRange,
              elevationRange: [0, 3000],
              upperPercentile: 100,
              opacity: toolbarState.pointOpacity,
            }),
          ],
          getTooltip: ({
            object,
          }: {
            object?: { colorValue?: number; elevationValue?: number; count?: number };
          }) => {
            if (!object) return null;
            return {
              html: `<div>
                <div>Count: ${object.count ?? 0}</div>
                <div>Value: ${(object.elevationValue ?? 0).toFixed(2)}</div>
              </div>`,
              style: {
                backgroundColor: '#1a1a2e',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
              },
            };
          },
        }) as DeckInstance;

        deckRef.current = deck;
        setDeckLoaded(true);

        resizeObserver = new ResizeObserver(() => {
          if (containerRef.current && deck) {
            deck.setProps({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            });
          }
        });
        resizeObserver.observe(containerRef.current);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load deck.gl');
      }
    };

    loadDeckGl();

    return () => {
      resizeObserver?.disconnect();
      deck?.finalize();
      deckRef.current = null;
    };
  }, [data, args, toolbarState, containerRef, deckRef]);

  if (loadError) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiText color="danger">{loadError}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {!deckLoaded && (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a2e',
        }}
      />
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiButtonIcon,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { LensChartLoadEvent } from '@kbn/visualization-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import type { DataView } from '@kbn/data-views-plugin/public';
import { LensConfig, LensConfigOptions } from '@kbn/lens-embeddable-utils/config_builder/types';
import type { TypedLensByValueInput, LensPublicStart } from '@kbn/lens-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  stateHelpers: Awaited<ReturnType<LensPublicStart['stateHelperApi']>>;
}) => {
  const ref = useRef(false);
  const [embeddableInput, setEmbeddableInput] = useState<TypedLensByValueInput | undefined>(
    undefined
  );
  const [lensLoadEvent, setLensLoadEvent] = useState<LensChartLoadEvent | null>(null);
  const configBuilder = useMemo(
    () => new LensConfigBuilder(props.stateHelpers.formula, props.plugins.dataViews),
    [props.plugins.dataViews, props.stateHelpers.formula]
  );
  const config = useMemo(() => {
    return {
      chartType: 'metric',
      title: 'metric chart',
      layers: [
        {
          label: 'metric layer',
          dataset: {
            esql: 'from kibana_sample_data_logs | stats count=count(bytes)',
          },
          value: 'count',
        },
      ],
    } as unknown as LensConfig;
  }, []);

  const options: LensConfigOptions = useMemo(() => {
    return {
      embeddable: true,
      timeRange: {
        from: 'now-30d',
        to: 'now',
        type: 'relative',
      },
    };
  }, []);
  useEffect(() => {
    ref.current = true;
    configBuilder.build(config, options).then((input) => {
      if (ref.current) {
        setEmbeddableInput(input as TypedLensByValueInput);
      }
    });
    return () => {
      ref.current = false;
    };
  }, [config, configBuilder, options, props.plugins.dataViews, props.stateHelpers.formula]);

  // get the Lens load event from the embeddable
  const onLoad = useCallback(
    (
      isLoading: boolean,
      adapters: LensChartLoadEvent['adapters'] | undefined,
      lensEmbeddableOutput$?: LensChartLoadEvent['embeddableOutput$']
    ) => {
      const adapterTables = adapters?.tables?.tables;
      if (adapterTables && !isLoading) {
        setLensLoadEvent({
          adapters,
          embeddableOutput$: lensEmbeddableOutput$,
        });
      }
    },
    []
  );
  const LensComponent = props.plugins.lens.EmbeddableComponent;

  // type InlineEditLensEmbeddableContext
  const triggerOptions = {
    attributes: embeddableInput?.attributes,
    lensEvent: lensLoadEvent,
    onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
      if (embeddableInput) {
        const newInput = {
          ...embeddableInput,
          attributes: newAttributes,
        };
        setEmbeddableInput(newInput);
      }
    },
    onApply: () => {
      alert('optional onApply callback!');
    },
  };

  return (
    <KibanaContextProvider
      services={{
        uiSettings: props.core.uiSettings,
        settings: props.core.settings,
        theme: props.core.theme,
      }}
    >
      <EuiPage>
        <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader
            paddingSize="s"
            bottomBorder={true}
            pageTitle="Lens embeddable inline editing"
          />
          <EuiPageSection paddingSize="s">
            <EuiFlexGroup
              className="eui-fullHeight"
              gutterSize="none"
              direction="column"
              responsive={false}
            >
              <EuiFlexItem className="eui-fullHeight">
                <EuiPanel hasShadow={false}>
                  <p>Inline editing of an ES|QL chart.</p>
                  <EuiSpacer />
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      {embeddableInput && (
                        <LensComponent
                          style={{ height: 500 }}
                          {...embeddableInput}
                          onLoad={onLoad}
                        />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        size="xs"
                        iconType="pencil"
                        onClick={() => {
                          props.plugins.uiActions
                            .getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER')
                            .exec(triggerOptions);
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </KibanaContextProvider>
  );
};

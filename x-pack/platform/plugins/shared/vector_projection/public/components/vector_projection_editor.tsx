/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  DEFAULT_AUTO_ROTATE,
  DEFAULT_BACKGROUND,
  DEFAULT_CLUSTER_DETAIL,
  DEFAULT_FOG_STRENGTH,
  DEFAULT_MIN_DIST,
  DEFAULT_N_NEIGHBORS,
  DEFAULT_POINT_SIZE,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_SHOW_LABELS,
  MAX_POINT_SIZE,
  MAX_SAMPLE_SIZE,
  MIN_POINT_SIZE,
  type BackgroundOption,
  type ClusterDetail,
} from '../../common/constants';
import { fetchDenseSemanticTextFields } from '../embeddable/fetch_vector_sample';
import type { VectorProjectionServices } from '../services';
import type { VectorProjectionConfig } from '../types';
import { getLabelFieldNames, getVectorFieldNames } from './field_utils';

interface Props {
  services: VectorProjectionServices;
  initialConfig?: VectorProjectionConfig;
  isNewPanel: boolean;
  ariaLabelledBy: string;
  onSave: (config: VectorProjectionConfig) => void;
  onCancel: () => void;
}

const toOption = (value: string, label = value): EuiComboBoxOptionOption<string> => ({
  label,
  value,
});

const dimensionOptions = [
  {
    id: '2',
    label: i18n.translate('xpack.vectorProjection.editor.dimensions2d', { defaultMessage: '2D' }),
  },
  {
    id: '3',
    label: i18n.translate('xpack.vectorProjection.editor.dimensions3d', { defaultMessage: '3D' }),
  },
];

const clusterDetailOptions: Array<{ value: ClusterDetail; text: string }> = [
  {
    value: 'low',
    text: i18n.translate('xpack.vectorProjection.editor.clusterDetailLow', {
      defaultMessage: 'Low',
    }),
  },
  {
    value: 'medium',
    text: i18n.translate('xpack.vectorProjection.editor.clusterDetailMedium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: 'high',
    text: i18n.translate('xpack.vectorProjection.editor.clusterDetailHigh', {
      defaultMessage: 'High',
    }),
  },
  {
    value: 'very_high',
    text: i18n.translate('xpack.vectorProjection.editor.clusterDetailVeryHigh', {
      defaultMessage: 'Very high',
    }),
  },
];

const SAMPLE_SIZE_PRESETS: readonly number[] = [1000, 2000, 5000, MAX_SAMPLE_SIZE];
const N_NEIGHBORS_PRESETS: readonly number[] = [5, 10, 15, 30, 50];
const MIN_DIST_PRESETS: readonly number[] = [0.01, 0.05, 0.1, 0.25, 0.5];

/** Keeps a saved value that isn't a preset selectable, so editing a panel doesn't silently change it. */
const toPresetOptions = (
  presets: readonly number[],
  current: number,
  format: (value: number) => string = String
): Array<{ value: string; text: string }> =>
  [...new Set([...presets, current])]
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), text: format(value) }));

const formatCount = (value: number) => value.toLocaleString();

const backgroundOptions: Array<{ id: BackgroundOption; label: string }> = [
  {
    id: 'light',
    label: i18n.translate('xpack.vectorProjection.editor.backgroundLight', {
      defaultMessage: 'Light',
    }),
  },
  {
    id: 'dark',
    label: i18n.translate('xpack.vectorProjection.editor.backgroundDark', {
      defaultMessage: 'Dark',
    }),
  },
];

const isClusterDetail = (value: string): value is ClusterDetail =>
  clusterDetailOptions.some((option) => option.value === value);

const denseVectorGroupLabel = i18n.translate(
  'xpack.vectorProjection.editor.denseVectorGroupLabel',
  { defaultMessage: 'Dense vector' }
);

const semanticTextGroupLabel = i18n.translate(
  'xpack.vectorProjection.editor.semanticTextGroupLabel',
  { defaultMessage: 'Semantic text' }
);

const toGroupOption = (
  label: string,
  names: string[]
): EuiComboBoxOptionOption<string> | undefined =>
  names.length > 0
    ? { label, isGroupLabelOption: true, options: names.map((name) => toOption(name)) }
    : undefined;

export const VectorProjectionEditor = ({
  services,
  initialConfig,
  isNewPanel,
  ariaLabelledBy,
  onSave,
  onCancel,
}: Props) => {
  const { dataViews } = services;
  const [dataViewList, setDataViewList] = useState<Array<{ id: string; title: string }>>([]);
  const [dataViewId, setDataViewId] = useState<string | undefined>(initialConfig?.data_view_id);
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [vectorField, setVectorField] = useState(initialConfig?.vector_field);
  const [labelField, setLabelField] = useState(initialConfig?.label_field);
  const [sampleSize, setSampleSize] = useState(initialConfig?.sample_size ?? DEFAULT_SAMPLE_SIZE);
  const [dimensions, setDimensions] = useState<2 | 3>(initialConfig?.dimensions ?? 2);
  const [nNeighbors, setNNeighbors] = useState(initialConfig?.n_neighbors ?? DEFAULT_N_NEIGHBORS);
  const [minDist, setMinDist] = useState(initialConfig?.min_dist ?? DEFAULT_MIN_DIST);
  const [clusterDetail, setClusterDetail] = useState<ClusterDetail>(
    initialConfig?.cluster_detail ?? DEFAULT_CLUSTER_DETAIL
  );
  const [pointSize, setPointSize] = useState(initialConfig?.point_size ?? DEFAULT_POINT_SIZE);
  const [fogStrength, setFogStrength] = useState(
    initialConfig?.fog_strength ?? DEFAULT_FOG_STRENGTH
  );
  const [background, setBackground] = useState<BackgroundOption>(
    initialConfig?.background ?? DEFAULT_BACKGROUND
  );
  const [autoRotate, setAutoRotate] = useState(initialConfig?.auto_rotate ?? DEFAULT_AUTO_ROTATE);
  const [showLabels, setShowLabels] = useState(initialConfig?.show_labels ?? DEFAULT_SHOW_LABELS);

  useEffect(() => {
    let ignore = false;
    Promise.all([dataViews.getIdsWithTitle(), dataViews.getDefaultId()]).then(
      ([list, defaultId]) => {
        if (ignore) return;
        setDataViewList(list.map(({ id, title, name }) => ({ id, title: name ?? title })));
        setDataViewId((current) => current ?? defaultId ?? list[0]?.id);
      }
    );
    return () => {
      ignore = true;
    };
  }, [dataViews]);

  useEffect(() => {
    if (!dataViewId) return;
    let ignore = false;
    dataViews.get(dataViewId).then((nextDataView) => {
      if (!ignore) setDataView(nextDataView);
    });
    return () => {
      ignore = true;
    };
  }, [dataViews, dataViewId]);

  const [semanticFieldNames, setSemanticFieldNames] = useState<string[]>([]);
  const [isLoadingSemanticFields, setIsLoadingSemanticFields] = useState(false);

  useEffect(() => {
    if (!dataView) return;
    const abortController = new AbortController();
    setIsLoadingSemanticFields(true);
    fetchDenseSemanticTextFields(services, dataView, abortController.signal)
      .catch(() => [])
      .then((names) => {
        if (abortController.signal.aborted) return;
        setSemanticFieldNames(names);
        setIsLoadingSemanticFields(false);
      });
    return () => abortController.abort();
  }, [services, dataView]);

  const denseFieldNames = useMemo(
    () => (dataView ? getVectorFieldNames(dataView) : []),
    [dataView]
  );
  const vectorFieldNames = useMemo(
    () => [...denseFieldNames, ...semanticFieldNames],
    [denseFieldNames, semanticFieldNames]
  );
  const vectorFieldOptions = useMemo(
    () =>
      [
        toGroupOption(denseVectorGroupLabel, denseFieldNames),
        toGroupOption(semanticTextGroupLabel, semanticFieldNames),
      ].filter((option): option is EuiComboBoxOptionOption<string> => option !== undefined),
    [denseFieldNames, semanticFieldNames]
  );
  const labelFieldNames = useMemo(() => (dataView ? getLabelFieldNames(dataView) : []), [dataView]);

  useEffect(() => {
    if (!dataView || isLoadingSemanticFields) return;
    setVectorField((current) =>
      current && vectorFieldNames.includes(current) ? current : vectorFieldNames[0]
    );
    setLabelField((current) =>
      current && labelFieldNames.includes(current) ? current : undefined
    );
  }, [dataView, isLoadingSemanticFields, vectorFieldNames, labelFieldNames]);

  const canSave = Boolean(dataViewId && vectorField);

  const handleSave = () => {
    if (!dataViewId || !vectorField) return;
    onSave({
      data_view_id: dataViewId,
      vector_field: vectorField,
      label_field: labelField,
      sample_size: sampleSize,
      dimensions,
      n_neighbors: nNeighbors,
      min_dist: minDist,
      cluster_detail: clusterDetail,
      point_size: pointSize,
      fog_strength: fogStrength,
      background,
      auto_rotate: autoRotate,
      show_labels: showLabels,
    });
  };

  const selectedDataView = dataViewList.find(({ id }) => id === dataViewId);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>
            {isNewPanel ? (
              <FormattedMessage
                id="xpack.vectorProjection.editor.createTitle"
                defaultMessage="Create vector projection"
              />
            ) : (
              <FormattedMessage
                id="xpack.vectorProjection.editor.editTitle"
                defaultMessage="Edit vector projection"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" fullWidth>
          <EuiFormRow
            label={i18n.translate('xpack.vectorProjection.editor.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              options={dataViewList.map(({ id, title }) => toOption(id, title))}
              selectedOptions={
                selectedDataView ? [toOption(selectedDataView.id, selectedDataView.title)] : []
              }
              onChange={([selected]) => setDataViewId(selected?.value)}
              data-test-subj="vectorProjectionDataViewSelect"
            />
          </EuiFormRow>

          {dataView && !isLoadingSemanticFields && vectorFieldNames.length === 0 ? (
            <>
              <EuiSpacer size="m" />
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.vectorProjection.editor.noVectorFieldsTitle', {
                  defaultMessage: 'This data view has no vector fields',
                })}
                text={i18n.translate('xpack.vectorProjection.editor.noVectorFieldsBody', {
                  defaultMessage:
                    'Choose a data view with a dense_vector field, or a semantic_text field that uses a dense embedding model. Sparse models such as ELSER are not supported.',
                })}
              />
            </>
          ) : null}

          <EuiFormRow
            label={i18n.translate('xpack.vectorProjection.editor.vectorFieldLabel', {
              defaultMessage: 'Vector field',
            })}
            helpText={i18n.translate('xpack.vectorProjection.editor.vectorFieldHelp', {
              defaultMessage:
                'Semantic text fields use dense embeddings only. Documents with several chunks are plotted at the average of their chunk embeddings.',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              isLoading={isLoadingSemanticFields}
              isDisabled={vectorFieldNames.length === 0}
              options={vectorFieldOptions}
              selectedOptions={vectorField ? [toOption(vectorField)] : []}
              onChange={([selected]) => setVectorField(selected?.value)}
              data-test-subj="vectorProjectionVectorFieldSelect"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.vectorProjection.editor.labelFieldLabel', {
              defaultMessage: 'Color by',
            })}
            helpText={i18n.translate('xpack.vectorProjection.editor.labelFieldHelp', {
              defaultMessage: 'Leave empty to color points by automatic clustering.',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.translate('xpack.vectorProjection.editor.labelFieldPlaceholder', {
                defaultMessage: 'Automatic clusters',
              })}
              options={labelFieldNames.map((name) => toOption(name))}
              selectedOptions={labelField ? [toOption(labelField)] : []}
              onChange={([selected]) => setLabelField(selected?.value)}
              data-test-subj="vectorProjectionLabelFieldSelect"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />
          <EuiAccordion
            id="vectorProjectionAdvancedSettings"
            buttonContent={i18n.translate('xpack.vectorProjection.editor.advancedSettings', {
              defaultMessage: 'UMAP settings',
            })}
            paddingSize="s"
            initialIsOpen
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.vectorProjection.editor.nNeighborsLabel', {
                    defaultMessage: 'Neighbors',
                  })}
                  helpText={i18n.translate('xpack.vectorProjection.editor.nNeighborsHelp', {
                    defaultMessage: 'Higher values preserve more global structure.',
                  })}
                >
                  <EuiSelect
                    options={toPresetOptions(N_NEIGHBORS_PRESETS, nNeighbors)}
                    value={String(nNeighbors)}
                    onChange={(e) => setNNeighbors(Number(e.target.value))}
                    data-test-subj="vectorProjectionNNeighborsSelect"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.vectorProjection.editor.minDistLabel', {
                    defaultMessage: 'Minimum distance',
                  })}
                  helpText={i18n.translate('xpack.vectorProjection.editor.minDistHelp', {
                    defaultMessage: 'Lower values pack clusters more tightly.',
                  })}
                >
                  <EuiSelect
                    options={toPresetOptions(MIN_DIST_PRESETS, minDist)}
                    value={String(minDist)}
                    onChange={(e) => setMinDist(Number(e.target.value))}
                    data-test-subj="vectorProjectionMinDistSelect"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.vectorProjection.editor.sampleSizeLabel', {
                    defaultMessage: 'Max points',
                  })}
                  helpText={i18n.translate('xpack.vectorProjection.editor.sampleSizeHelp', {
                    defaultMessage: 'Documents randomly sampled for the projection.',
                  })}
                >
                  <EuiSelect
                    options={toPresetOptions(SAMPLE_SIZE_PRESETS, sampleSize, formatCount)}
                    value={String(sampleSize)}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    data-test-subj="vectorProjectionSampleSizeSelect"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate('xpack.vectorProjection.editor.dimensionsLabel', {
                    defaultMessage: 'Layout',
                  })}
                >
                  <EuiButtonGroup
                    legend={i18n.translate('xpack.vectorProjection.editor.dimensionsLegend', {
                      defaultMessage: 'Projection dimensions',
                    })}
                    options={dimensionOptions}
                    idSelected={String(dimensions)}
                    onChange={(id) => setDimensions(id === '3' ? 3 : 2)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFormRow
              label={i18n.translate('xpack.vectorProjection.editor.clusterDetailLabel', {
                defaultMessage: 'Cluster detail',
              })}
              helpText={
                labelField
                  ? i18n.translate('xpack.vectorProjection.editor.clusterDetailDisabledHelp', {
                      defaultMessage: 'Only applies when points are colored by automatic clusters.',
                    })
                  : i18n.translate('xpack.vectorProjection.editor.clusterDetailHelp', {
                      defaultMessage: 'Higher detail splits the projection into more clusters.',
                    })
              }
            >
              <EuiSelect
                options={clusterDetailOptions}
                value={clusterDetail}
                disabled={Boolean(labelField)}
                onChange={(e) => {
                  if (isClusterDetail(e.target.value)) setClusterDetail(e.target.value);
                }}
                data-test-subj="vectorProjectionClusterDetailSelect"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.vectorProjection.editor.pointSizeLabel', {
                defaultMessage: 'Point size',
              })}
            >
              <EuiRange
                min={MIN_POINT_SIZE}
                max={MAX_POINT_SIZE}
                step={0.5}
                value={pointSize}
                showInput
                onChange={(e) => setPointSize(Number(e.currentTarget.value))}
                data-test-subj="vectorProjectionPointSizeRange"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.vectorProjection.editor.fogLabel', {
                defaultMessage: 'Fog',
              })}
              helpText={i18n.translate('xpack.vectorProjection.editor.fogHelp', {
                defaultMessage: 'Fades distant points in 3D layouts.',
              })}
            >
              <EuiRange
                min={0}
                max={1}
                step={0.05}
                value={fogStrength}
                showInput
                disabled={dimensions !== 3}
                onChange={(e) => setFogStrength(Number(e.currentTarget.value))}
                data-test-subj="vectorProjectionFogRange"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.vectorProjection.editor.backgroundLabel', {
                defaultMessage: 'Background',
              })}
            >
              <EuiButtonGroup
                legend={i18n.translate('xpack.vectorProjection.editor.backgroundLegend', {
                  defaultMessage: 'Plot background',
                })}
                options={backgroundOptions}
                idSelected={background}
                onChange={(id) => setBackground(id === 'dark' ? 'dark' : 'light')}
                data-test-subj="vectorProjectionBackgroundButtonGroup"
              />
            </EuiFormRow>

            <EuiFormRow
              helpText={i18n.translate('xpack.vectorProjection.editor.autoRotateHelp', {
                defaultMessage: 'Slowly spins 3D layouts.',
              })}
            >
              <EuiSwitch
                label={i18n.translate('xpack.vectorProjection.editor.autoRotateLabel', {
                  defaultMessage: 'Rotate',
                })}
                checked={autoRotate}
                disabled={dimensions !== 3}
                onChange={(e) => setAutoRotate(e.target.checked)}
                data-test-subj="vectorProjectionAutoRotateSwitch"
              />
            </EuiFormRow>

            <EuiFormRow
              helpText={i18n.translate('xpack.vectorProjection.editor.showLabelsHelp', {
                defaultMessage: 'Shows category or cluster names at the center of each group.',
              })}
            >
              <EuiSwitch
                label={i18n.translate('xpack.vectorProjection.editor.showLabelsLabel', {
                  defaultMessage: 'Show labels',
                })}
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                data-test-subj="vectorProjectionShowLabelsSwitch"
              />
            </EuiFormRow>
          </EuiAccordion>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="vectorProjectionCancelButton">
              <FormattedMessage id="xpack.vectorProjection.editor.cancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!canSave}
              onClick={handleSave}
              data-test-subj="vectorProjectionSaveButton"
            >
              <FormattedMessage id="xpack.vectorProjection.editor.save" defaultMessage="Save" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

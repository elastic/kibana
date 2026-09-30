/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import type { EuiBasicTableColumn, EuiConfirmModalProps } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { esql } from '@elastic/esql';

import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { getFailureTooltip } from '@kbn/lens-common';

import { layerTypes } from '../../..';

import type { ConvertibleLayer, LayerType } from './esql_conversion_types';

const typeLabels: Record<LayerType, (count: number) => string> = {
  data: (count: number) =>
    i18n.translate('xpack.lens.config.visualizationDescription', {
      defaultMessage: '{count, plural, one {Visualization} other {Visualizations}}',
      values: { count },
    }),
  annotations: (count: number) =>
    i18n.translate('xpack.lens.config.annotationDescription', {
      defaultMessage: '{count, plural, one {Annotation} other {Annotations}}',
      values: { count },
    }),
  referenceLine: (count: number) =>
    i18n.translate('xpack.lens.config.referenceLineDescription', {
      defaultMessage: '{count, plural, one {Reference line} other {Reference lines}}',
      values: { count },
    }),
};

export const ConvertToEsqlModal: React.FunctionComponent<{
  layers: ConvertibleLayer[];
  onCancel: EuiConfirmModalProps['onCancel'];
  /**
   * Callback invoked when user confirms the conversion.
   */
  onConfirm: () => void;
}> = ({ layers, onCancel, onConfirm }) => {
  const { euiTheme } = useEuiTheme();

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = useCallback(
    (layer: ConvertibleLayer) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

      if (itemIdToExpandedRowMapValues[layer.id]) {
        delete itemIdToExpandedRowMapValues[layer.id];
      } else {
        itemIdToExpandedRowMapValues[layer.id] = (
          <EuiFlexItem>
            <EuiCodeBlock isCopyable language="esql" paddingSize="s">
              {esql(layer.query).print('wrapping')}
            </EuiCodeBlock>
          </EuiFlexItem>
        );
      }

      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap]
  );

  const columns: Array<EuiBasicTableColumn<ConvertibleLayer>> = useMemo(
    () => [
      {
        field: 'icon',
        name: '',
        width: euiTheme.size.l,
        render: (icon: string) => <EuiIcon type={icon} aria-hidden={true} />,
      },
      {
        field: 'name',
        name: 'Layer',
        width: `${parseInt(euiTheme.size.xl, 10) * 5}px`,
        truncateText: true,
        render: (name: string, layer: ConvertibleLayer) => {
          if (layer.isConvertibleToEsql || layer.type !== layerTypes.DATA) {
            return name;
          }
          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>{name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  color="warning"
                  content={getFailureTooltip(layer.failureReason)}
                  iconProps={{
                    'aria-label': getFailureTooltip(layer.failureReason),
                    'data-test-subj': `lnsEsqlConversionFailureReason-${layer.id}`,
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.lens.config.layerTypeColumnLabel', {
          defaultMessage: 'Type',
        }),
        truncateText: true,
        render: (type: LayerType) => typeLabels[type](1),
      },
      {
        name: i18n.translate('xpack.lens.config.conversionResultColumnLabel', {
          defaultMessage: 'Result',
        }),
        render: (layer: ConvertibleLayer) => {
          if (layer.type !== layerTypes.DATA) {
            return i18n.translate('xpack.lens.config.layerWillRemainUnchangedLabel', {
              defaultMessage: 'Will remain unchanged',
            });
          }

          return layer.isConvertibleToEsql
            ? i18n.translate('xpack.lens.config.layerWillBeConvertedLabel', {
                defaultMessage: 'Will be converted',
              })
            : i18n.translate('xpack.lens.config.layerCannotBeConvertedLabel', {
                defaultMessage: 'Cannot be converted',
              });
        },
      },
      {
        align: 'right',
        width: euiTheme.size.xxl,
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <p>
              {i18n.translate('xpack.lens.config.expandEsqlPreviewDescription', {
                defaultMessage: 'Expand to view ES|QL query',
              })}
            </p>
          </EuiScreenReaderOnly>
        ),
        render: (layer: ConvertibleLayer) => {
          if (!layer.isConvertibleToEsql) {
            return null;
          }

          const isExpanded = Boolean(itemIdToExpandedRowMap[layer.id]);

          return (
            <EuiToolTip
              content={
                isExpanded
                  ? i18n.translate('xpack.lens.config.collapseAriaLabel', {
                      defaultMessage: 'Collapse',
                    })
                  : i18n.translate('xpack.lens.config.expandAriaLabel', {
                      defaultMessage: 'Expand',
                    })
              }
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                onClick={() => toggleDetails(layer)}
                aria-label={
                  isExpanded
                    ? i18n.translate('xpack.lens.config.collapseAriaLabel', {
                        defaultMessage: 'Collapse',
                      })
                    : i18n.translate('xpack.lens.config.expandAriaLabel', {
                        defaultMessage: 'Expand',
                      })
                }
                iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
              />
            </EuiToolTip>
          );
        },
      },
    ],
    [euiTheme.size.l, euiTheme.size.xl, euiTheme.size.xxl, itemIdToExpandedRowMap, toggleDetails]
  );

  const dataLayers = layers.filter((layer) => layer.type === layerTypes.DATA);
  // Conversion is chart-level because Lens does not support mixing form-based and ES|QL data
  // layers. The table summarizes the outcome instead of offering selections that cannot be
  // honored: every data layer must convert, while annotation and reference-line layers remain
  // in their existing datasource.
  const isConfirmButtonEnabled =
    dataLayers.length > 0 && dataLayers.every((layer) => layer.isConvertibleToEsql);

  return (
    <EuiConfirmModal
      aria-label={i18n.translate('xpack.lens.config.switchToQueryModeAriaLabel', {
        defaultMessage: 'Convert visualization to ES|QL',
      })}
      title={i18n.translate('xpack.lens.config.switchToQueryModeTitle', {
        defaultMessage: 'Convert visualization to ES|QL',
      })}
      onCancel={onCancel}
      cancelButtonText={i18n.translate('xpack.lens.config.cancelButtonTextButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate('xpack.lens.config.switchToQueryModeButtonLabel', {
        defaultMessage: 'Convert to ES|QL',
      })}
      confirmButtonDisabled={!isConfirmButtonEnabled}
      data-test-subj="lnsConvertToEsqlModal"
    >
      <p>
        {i18n.translate('xpack.lens.config.queryModeDescription', {
          defaultMessage:
            'All data layers in this visualization will be converted to ES|QL. Annotation and reference line layers will remain unchanged.',
        })}{' '}
        {/* TODO: Add link to docs */}
        <EuiLink href="" target="_blank" external={false}>
          {i18n.translate('xpack.lens.config.readMoreLinkText', {
            defaultMessage: 'Read more.',
          })}
        </EuiLink>
      </p>

      <KbnWarningCallout
        size="s"
        title={i18n.translate('xpack.lens.config.queryModeWarningDescription', {
          defaultMessage: `Once you save the chart after converting to ES|QL, you can't switch back.`,
        })}
      />

      <EuiSpacer size="l" />

      {layers.length > 1 ? (
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.lens.config.layersTableCaption', {
            defaultMessage: 'Layer conversion summary',
          })}
          responsiveBreakpoint={false}
          items={layers}
          itemId="id"
          columns={columns}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        />
      ) : layers.length === 1 && layers[0].isConvertibleToEsql ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" component="div">
              <p>
                <strong>
                  {i18n.translate('xpack.lens.config.queryPreviewDescription', {
                    defaultMessage: 'Query preview',
                  })}
                </strong>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCodeBlock isCopyable language="esql" paddingSize="s">
              {esql(layers[0].query).print('wrapping')}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </EuiConfirmModal>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';

import type {
  EuiBasicTableColumn,
  EuiConfirmModalProps,
  EuiTableSelectionType,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Layer {
  id: string;
  icon: string;
  name: string;
  typology: string;
  query: string;
  isConvertibleToEsql: boolean;
}

export const ConvertToEsqlModal: React.FunctionComponent<{
  layers: Layer[];
  onCancel: EuiConfirmModalProps['onCancel'];
  /**
   * Callback invoked when user confirms the conversion.
   * @param params - Object containing array of layer IDs selected for conversion
   */
  onConfirm: (params: { layersToConvert: string[] }) => void;
}> = ({ layers, onCancel, onConfirm }) => {
  const { euiTheme } = useEuiTheme();

  const [selectedItems, setSelectedItems] = useState<Layer[]>([]);
  const onSelectionChange = useCallback((items: Layer[]) => {
    setSelectedItems(items);
  }, []);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = useCallback(
    (layer: Layer) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

      if (itemIdToExpandedRowMapValues[layer.id]) {
        delete itemIdToExpandedRowMapValues[layer.id];
      } else {
        itemIdToExpandedRowMapValues[layer.id] = (
          <EuiFlexItem>
            <EuiCodeBlock isCopyable language="esql" paddingSize="s">
              {layer.query}
            </EuiCodeBlock>
          </EuiFlexItem>
        );
      }

      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap]
  );

  const columns: Array<EuiBasicTableColumn<Layer>> = [
    {
      field: 'icon',
      name: '',
      width: euiTheme.size.l,
      render: (icon: string) => <EuiIcon type={icon} />,
    },
    {
      field: 'name',
      name: 'Layer',
      width: '166px',
      truncateText: true,
    },
    {
      field: 'typology',
      name: 'Typology',
      truncateText: true,
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
      render: (layer: Layer) => {
        const isExpanded = Boolean(itemIdToExpandedRowMap[layer.id]);

        return (
          // Add tooltip?
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
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            disabled={!layer.isConvertibleToEsql}
          />
        );
      },
    },
  ];

  const selection: EuiTableSelectionType<Layer> = {
    selectable: (layer: Layer) => layer.isConvertibleToEsql,
    selectableMessage: (selectable: boolean, layer: Layer) => {
      // TODO: Add message with the typologies that cannot be switched yet
      return !selectable
        ? i18n.translate('xpack.lens.config.cannotBeSwitchedAriaLabel', {
            defaultMessage: '{layerName} cannot be switched to query mode',
            values: {
              layerName: layer.name,
            },
          })
        : i18n.translate('xpack.lens.config.selectLayerAriaLabel', {
            defaultMessage: 'Select {layerName} for conversion to query mode',
            values: {
              layerName: layer.name,
            },
          });
    },
    onSelectionChange,
    initialSelected: [],
  };

  const isConfirmButtonEnabled =
    (layers.length === 1 && layers[0].isConvertibleToEsql) ||
    (layers.length > 1 && selectedItems.length > 0);

  return (
    <EuiConfirmModal
      aria-label={i18n.translate('xpack.lens.config.switchToQueryModeAriaLabel', {
        defaultMessage: 'Switch to Query mode',
      })}
      title={i18n.translate('xpack.lens.config.switchToQueryModeTitle', {
        defaultMessage: 'Switch to Query mode',
      })}
      onCancel={onCancel}
      cancelButtonText={i18n.translate('xpack.lens.config.cancelButtonTextButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      onConfirm={() => {
        let layersToConvert: string[] = [];
        if (layers.length === 1 && layers[0].isConvertibleToEsql) {
          layersToConvert = [layers[0].id];
        } else if (layers.length > 1 && selectedItems.length > 0) {
          layersToConvert = selectedItems.map((layer) => layer.id);
        }
        onConfirm({ layersToConvert });
      }}
      confirmButtonText={i18n.translate('xpack.lens.config.switchToQueryModeButtonLabel', {
        defaultMessage: 'Switch to query mode',
      })}
      confirmButtonDisabled={!isConfirmButtonEnabled}
    >
      <p>
        {i18n.translate('xpack.lens.config.queryModeDescription', {
          defaultMessage: 'Query mode enables advanced data analysis with ES|QL.',
        })}{' '}
        {/* TODO: Add link to docs */}
        <EuiLink href="" target="_blank" external={false}>
          {i18n.translate('xpack.lens.config.readMoreLinkText', {
            defaultMessage: 'Read more.',
          })}
        </EuiLink>
      </p>

      <EuiCallOut
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate('xpack.lens.config.queryModeWarningDescription', {
          defaultMessage: 'Once query mode is activated you cannot switch back to visual mode.',
        })}
      />

      <EuiSpacer size="l" />

      {layers.length > 1 ? (
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.lens.config.layersTableCaption', {
            defaultMessage: 'Layers available for conversion to query mode',
          })}
          responsiveBreakpoint={false}
          items={layers}
          itemId="id"
          columns={columns}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          selection={selection}
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
              {layers[0].query}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </EuiConfirmModal>
  );
};

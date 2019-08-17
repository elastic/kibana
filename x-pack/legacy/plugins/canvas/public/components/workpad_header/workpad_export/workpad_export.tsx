/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiContextMenu, EuiIcon } from '@elastic/eui';
// @ts-ignore Untyped local
import { Popover } from '../../popover';
import { DisabledPanel } from './disabled_panel';
import { PDFPanel } from './pdf_panel';
import { ExternalEmbedPanel } from './external_embed_panel';

type ClosePopoverFn = () => void;

type CopyTypes = 'pdf' | 'reportingConfig' | 'embed';
type ExportTypes = 'pdf' | 'json' | 'embed';
type ExportUrlTypes = 'pdf';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes) => void;
export type GetExportUrlFn = (type: ExportUrlTypes) => string;

export interface Props {
  enabled: boolean;
  onCopy: OnCopyFn;
  onExport: OnExportFn;
  getExportUrl: GetExportUrlFn;
}

export const WorkpadExport: FunctionComponent<Props> = ({
  enabled,
  onCopy,
  onExport,
  getExportUrl,
}) => {
  // @ts-ignore Fix all of this magic from EUI
  const flattenPanelTree = (tree, array = []) => {
    // @ts-ignore Fix all of this magic from EUI
    array.push(tree);

    if (tree.items) {
      // @ts-ignore Fix all of this magic from EUI
      tree.items.forEach(item => {
        const { panel } = item;
        if (panel) {
          flattenPanelTree(panel, array);
          item.panel = panel.id;
        }
      });
    }

    return array;
  };

  const getPDFPanel = (closePopover: ClosePopoverFn) => {
    return (
      <PDFPanel
        pdfURL={getExportUrl('pdf')}
        onExport={() => {
          onExport('pdf');
          closePopover();
        }}
        onCopy={() => {
          onCopy('pdf');
          closePopover();
        }}
      />
    );
  };

  const getPanelTree = (closePopover: ClosePopoverFn) => ({
    id: 0,
    title: 'Share this workpad',
    items: [
      {
        name: 'Download as JSON',
        icon: <EuiIcon type="exportAction" size="m" />,
        onClick: () => {
          onExport('json');
          closePopover();
        },
      },
      {
        name: 'PDF reports',
        icon: 'document',
        panel: {
          id: 1,
          title: 'PDF reports',
          content: enabled ? (
            getPDFPanel(closePopover)
          ) : (
            <DisabledPanel
              onCopy={() => {
                onCopy('pdf');
                closePopover();
              }}
            />
          ),
        },
      },
      {
        name: 'Embed Elsewhere',
        icon: 'globe',
        panel: {
          id: 2,
          title: 'External Embeds',
          content: (
            <ExternalEmbedPanel
              onCopy={() => {
                onCopy('embed');
                closePopover();
              }}
            />
          ),
        },
      },
    ],
  });

  const exportControl = (togglePopover: () => void) => (
    <EuiButtonIcon iconType="share" aria-label="Share this workpad" onClick={togglePopover} />
  );

  return (
    <Popover
      button={exportControl}
      panelPaddingSize="none"
      tooltip="Share workpad"
      tooltipPosition="bottom"
    >
      {({ closePopover }: { closePopover: ClosePopoverFn }) => (
        <EuiContextMenu initialPanelId={0} panels={flattenPanelTree(getPanelTree(closePopover))} />
      )}
    </Popover>
  );
};

WorkpadExport.propTypes = {
  enabled: PropTypes.bool.isRequired,
  onCopy: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  getExportUrl: PropTypes.func.isRequired,
};

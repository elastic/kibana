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

type ClosePopoverFn = () => void;

type CopyTypes = 'pdf' | 'reportingConfig';
type ExportTypes = 'pdf' | 'json';
type ExportUrlTypes = 'pdf';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes) => void;
export type GetExportUrlFn = (type: ExportUrlTypes) => string;

export interface Props {
  /** True if exporting is enabled, false otherwise. */
  enabled: boolean;
  /** Handler to invoke when an export URL is copied to the clipboard. */
  onCopy: OnCopyFn;
  /** Handler to invoke when an end product is exported. */
  onExport: OnExportFn;
  /** Handler to retrive an export URL based on the type of export requested. */
  getExportUrl: GetExportUrlFn;
}

/**
 * The Menu for Exporting a Workpad from Canvas.
 */
export const WorkpadExport: FunctionComponent<Props> = ({
  enabled,
  onCopy,
  onExport,
  getExportUrl,
}) => {
  // TODO: Fix all of this magic from EUI; this code is boilerplate from
  // EUI examples and isn't easily typed.
  const flattenPanelTree = (tree: any, array: any[] = []) => {
    array.push(tree);

    if (tree.items) {
      tree.items.forEach((item: any) => {
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
                onCopy('reportingConfig');
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

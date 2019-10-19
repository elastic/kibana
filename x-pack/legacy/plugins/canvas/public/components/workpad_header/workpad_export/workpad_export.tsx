/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiContextMenu, EuiIcon } from '@elastic/eui';
// @ts-ignore Untyped local
import { Popover } from '../../popover';
import { DisabledPanel } from './disabled_panel';
import { PDFPanel } from './pdf_panel';
import { ShareWebsiteFlyout } from './flyout';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderWorkpadExport: strings } = ComponentStrings;

type ClosePopoverFn = () => void;

type CopyTypes = 'pdf' | 'reportingConfig';
type ExportTypes = 'pdf' | 'json';
type ExportUrlTypes = 'pdf';
type CloseTypes = 'share';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes) => void;
export type OnCloseFn = (type: CloseTypes) => void;
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
  const [showFlyout, setShowFlyout] = useState(false);

  const onClose = () => {
    setShowFlyout(false);
  };

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
    title: strings.getShareWorkpadMessage(),
    items: [
      {
        name: strings.getShareDownloadJSONTitle(),
        icon: <EuiIcon type="exportAction" size="m" />,
        onClick: () => {
          onExport('json');
          closePopover();
        },
      },
      {
        name: strings.getShareDownloadPDFTitle(),
        icon: 'document',
        panel: {
          id: 1,
          title: strings.getShareDownloadPDFTitle(),
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
      {
        name: strings.getShareWebsiteTitle(),
        icon: <EuiIcon type="globe" size="m" />,
        onClick: () => {
          setShowFlyout(true);
          closePopover();
        },
      },
    ],
  });

  const exportControl = (togglePopover: (ev: MouseEvent) => void) => (
    <EuiButtonIcon
      iconType="share"
      aria-label={strings.getShareWorkpadMessage()}
      onClick={togglePopover}
    />
  );

  const flyout = showFlyout ? <ShareWebsiteFlyout onClose={onClose} /> : null;

  return (
    <div>
      <Popover
        button={exportControl}
        panelPaddingSize="none"
        tooltip={strings.getShareWorkpadMessage()}
        tooltipPosition="bottom"
      >
        {({ closePopover }: { closePopover: ClosePopoverFn }) => (
          <EuiContextMenu
            initialPanelId={0}
            panels={flattenPanelTree(getPanelTree(closePopover))}
          />
        )}
      </Popover>
      {flyout}
    </div>
  );
};

WorkpadExport.propTypes = {
  enabled: PropTypes.bool.isRequired,
  onCopy: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  getExportUrl: PropTypes.func.isRequired,
};

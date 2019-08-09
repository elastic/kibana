/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiButtonIcon,
  EuiSpacer,
  EuiCodeBlock,
  EuiCode,
  EuiContextMenu,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { Popover } from '../../popover';
import { Clipboard } from '../../clipboard';

export class WorkpadExport extends React.PureComponent {
  static propTypes = {
    enabled: PropTypes.bool.isRequired,
    onCopy: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    getExportUrl: PropTypes.func.isRequired,
  };

  anchorElement = React.createRef();

  flattenPanelTree(tree, array = []) {
    array.push(tree);

    if (tree.items) {
      tree.items.forEach(item => {
        if (item.panel) {
          this.flattenPanelTree(item.panel, array);
          item.panel = item.panel.id;
        }
      });
    }

    return array;
  }

  exportPdf = () => {
    this.props.onExport('pdf');
  };

  downloadWorkpad = () => {
    this.props.onExport('json');
  };

  renderPDFControls = closePopover => {
    const pdfUrl = this.props.getExportUrl('pdf');
    return (
      <div className="canvasWorkpadExport__panelContent">
        <EuiText size="s">
          <p>PDFs can take a minute or two to generate based on the size of your workpad.</p>
        </EuiText>
        <EuiSpacer size="s" />

        {this.props.options}

        <EuiButton
          fill
          onClick={() => {
            closePopover();
            this.exportPdf();
          }}
          size="s"
          style={{ width: '100%' }}
        >
          Generate PDF
        </EuiButton>
        <EuiSpacer size="s" />

        <EuiText size="s">
          <p>
            Alternatively, copy this POST URL to call generation from outside Kibana or from
            Watcher.
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        <Clipboard
          content={pdfUrl}
          onCopy={() => {
            this.props.onCopy('pdf');
            closePopover();
          }}
        >
          <EuiButton
            iconType="copy"
            size="s"
            style={{ width: '100%' }}
            aria-label="Alternatively, you can generate a PDF from a script or with Watcher by using this URL. Press Enter to copy the URL to clipboard."
          >
            Copy POST URL
          </EuiButton>
        </Clipboard>
      </div>
    );
  };

  renderPanelTree = closePopover => ({
    id: 0,
    title: 'Share this workpad',
    items: [
      {
        name: 'Download as JSON',
        icon: <EuiIcon type="exportAction" size="m" />,
        onClick: () => {
          closePopover();
          this.downloadWorkpad();
        },
      },
      {
        name: 'PDF reports',
        icon: 'document',
        panel: {
          id: 1,
          title: 'PDF reports',
          content: this.props.enabled
            ? this.renderPDFControls(closePopover)
            : this.renderDisabled(),
        },
      },
    ],
  });

  renderDisabled = () => {
    const reportingConfig = `xpack.reporting:
  enabled: true
  capture.browser.type: chromium`;

    return (
      <div className="canvasWorkpadExport__panelContent">
        <EuiText size="s">
          <p>
            Export to PDF is disabled. You must configure reporting to use the Chromium browser. Add
            this to your <EuiCode>kibana.yml</EuiCode> file.
          </p>
        </EuiText>
        <EuiSpacer />
        <Clipboard content={reportingConfig} onCopy={() => this.props.onCopy('reportingConfig')}>
          <EuiCodeBlock
            className="canvasWorkpadExport__reportingConfig"
            paddingSize="s"
            fontSize="s"
            language="yml"
          >
            {reportingConfig}
          </EuiCodeBlock>
        </Clipboard>
      </div>
    );
  };

  render() {
    const exportControl = togglePopover => (
      <EuiButtonIcon iconType="share" aria-label="Share this workpad" onClick={togglePopover} />
    );

    // TODO: replace this with `showShareContextMenu` in `ui/share` once it's been converted to React
    return (
      <Popover
        button={exportControl}
        panelPaddingSize="none"
        tooltip="Share workpad"
        tooltipPosition="bottom"
      >
        {({ closePopover }) => (
          <EuiContextMenu
            initialPanelId={0}
            panels={this.flattenPanelTree(this.renderPanelTree(closePopover))}
          />
        )}
      </Popover>
    );
  }
}

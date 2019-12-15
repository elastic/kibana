/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldText,
  EuiFieldNumber,
  EuiBadge,
  EuiButtonIcon,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiTextArea,
  EuiAccordion,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { ComponentStrings } from '../../../i18n';

const { WorkpadConfig: strings } = ComponentStrings;

export class WorkpadConfig extends PureComponent {
  static propTypes = {
    size: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    css: PropTypes.string,
    setSize: PropTypes.func.isRequired,
    setName: PropTypes.func.isRequired,
    setWorkpadCSS: PropTypes.func.isRequired,
  };

  state = {
    css: this.props.css,
  };

  render() {
    const { size, name, setSize, setName, setWorkpadCSS } = this.props;
    const { css } = this.state;
    const rotate = () => setSize({ width: size.height, height: size.width });

    const badges = [
      {
        name: '1080p',
        size: { height: 1080, width: 1920 },
      },
      {
        name: '720p',
        size: { height: 720, width: 1280 },
      },
      {
        name: 'A4',
        size: { height: 842, width: 590 },
      },
      {
        name: strings.getUSLetterButtonLabel(),
        size: { height: 792, width: 612 },
      },
    ];

    return (
      <div>
        <div className="canvasLayout__sidebarHeaderWorkpad">
          <EuiTitle size="xs">
            <h4>{strings.getTitle()}</h4>
          </EuiTitle>
        </div>

        <EuiSpacer size="m" />

        <EuiFormRow label={strings.getNameLabel()} display="rowCompressed">
          <EuiFieldText compressed value={name} onChange={e => setName(e.target.value)} />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiFormRow label={strings.getPageWidthLabel()} display="rowCompressed">
              <EuiFieldNumber
                compressed
                onChange={e => setSize({ width: Number(e.target.value), height: size.height })}
                value={size.width}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow display="rowCompressed" hasEmptyLabelSpace>
              <EuiToolTip position="bottom" content={strings.getFlipDimensionTooltip()}>
                <EuiButtonIcon
                  iconType="merge"
                  color="text"
                  onClick={rotate}
                  aria-label={strings.getFlipDimensionAriaLabel()}
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={strings.getPageHeightLabel()} display="rowCompressed">
              <EuiFieldNumber
                compressed
                onChange={e => setSize({ height: Number(e.target.value), width: size.width })}
                value={size.height}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <div>
          {badges.map((badge, i) => (
            <EuiBadge
              key={`page-size-badge-${i}`}
              color="hollow"
              onClick={() => setSize(badge.size)}
              aria-label={strings.getPageSizeBadgeAriaLabel(badge.name)}
              onClickAriaLabel={strings.getPageSizeBadgeOnClickAriaLabel(badge.name)}
            >
              {badge.name}
            </EuiBadge>
          ))}
        </div>

        <EuiSpacer size="m" />
        <div className="canvasArg--expandable">
          <EuiAccordion
            id="accordion-global-css"
            className="canvasArg__accordion"
            buttonContent={
              <EuiToolTip
                content={strings.getGlobalCSSTooltip()}
                position="left"
                className="canvasArg__tooltip"
              >
                <EuiText size="s" color="subdued">
                  {strings.getGlobalCSSLabel()}
                </EuiText>
              </EuiToolTip>
            }
          >
            <div className="canvasArg__content">
              <EuiTextArea
                aria-label={strings.getGlobalCSSTooltip()}
                value={css}
                compressed
                onChange={e => this.setState({ css: e.target.value })}
                rows={10}
              />
              <EuiSpacer size="s" />
              <EuiButton size="s" onClick={() => setWorkpadCSS(css || DEFAULT_WORKPAD_CSS)}>
                {strings.getApplyStylesheetButtonLabel()}
              </EuiButton>
              <EuiSpacer size="xs" />
            </div>
          </EuiAccordion>
        </div>
      </div>
    );
  }
}

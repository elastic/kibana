/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, MutableRefObject } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOutsideClickDetector,
  EuiPortal,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { flyoutContainerStyles } from './flyout.styles';

const DEFAULT_TITLE = i18n.translate('xpack.lens.colorSiblingFlyoutTitle', {
  defaultMessage: 'Color',
});

export function SettingWithSiblingFlyout({
  siblingRef,
  children,
  title = DEFAULT_TITLE,
  isInlineEditing,
  SettingTrigger,
  dataTestSubj = 'lns-settingWithSiblingFlyout',
}: {
  title?: string;
  siblingRef: MutableRefObject<HTMLDivElement | null>;
  SettingTrigger: ({ onClick }: { onClick: () => void }) => JSX.Element;
  children?: React.ReactElement | React.ReactElement[];
  isInlineEditing?: boolean;
  dataTestSubj?: string;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const euiThemeContext = useEuiTheme();

  const toggleFlyout = () => {
    setIsFlyoutOpen(!isFlyoutOpen);
  };

  const closeFlyout = () => {
    setIsFlyoutOpen(false);
    setFocusTrapIsEnabled(false);
  };

  useEffect(() => {
    // The EuiFocusTrap is disabled when inline editing as it causes bugs with comboboxes
    if (isFlyoutOpen && !isInlineEditing) {
      // without setTimeout here the flyout pushes content when animating
      setTimeout(() => {
        setFocusTrapIsEnabled(true);
      }, 255);
    }
  }, [isInlineEditing, isFlyoutOpen]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <SettingTrigger onClick={toggleFlyout} />
      {isFlyoutOpen && siblingRef.current && (
        <EuiPortal insert={{ sibling: siblingRef.current, position: 'after' }}>
          <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
            <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isFlyoutOpen}>
              <div
                role="dialog"
                aria-labelledby="lnsSettingWithSiblingFlyoutTitle"
                data-test-subj={dataTestSubj}
                css={[
                  flyoutContainerStyles(euiThemeContext),
                  siblingflyoutContainerStyles.self(euiThemeContext),
                ]}
              >
                <EuiFlyoutHeader
                  hasBorder
                  css={siblingflyoutContainerStyles.header(euiThemeContext)}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="text"
                        data-test-subj="lns-indexPattern-SettingWithSiblingFlyoutBack"
                        className="lnsSettingWithSiblingFlyout__backIcon"
                        onClick={closeFlyout}
                        iconType="sortLeft"
                        aria-label={i18n.translate('xpack.lens.settingWithSiblingFlyout.back', {
                          defaultMessage: 'Back',
                        })}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h3 id="lnsSettingWithSiblingFlyoutTitle">{title}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutHeader>

                {children && (
                  <div
                    className="eui-yScroll"
                    css={css`
                      flex: 1;
                    `}
                  >
                    {children}
                  </div>
                )}

                <EuiFlyoutFooter css={siblingflyoutContainerStyles.footer(euiThemeContext)}>
                  <EuiButtonEmpty flush="left" size="s" iconType="sortLeft" onClick={closeFlyout}>
                    {i18n.translate('xpack.lens.settingWithSiblingFlyout.back', {
                      defaultMessage: 'Back',
                    })}
                  </EuiButtonEmpty>
                </EuiFlyoutFooter>
              </div>
            </EuiOutsideClickDetector>
          </EuiFocusTrap>
        </EuiPortal>
      )}
    </EuiFlexGroup>
  );
}

const siblingflyoutContainerStyles = {
  self: ({ euiTheme }: UseEuiTheme) => css`
    position: absolute;
    right: 0;
    left: 0;
    top: 0;
    bottom: 0;
    // making just a bit higher than the dimension flyout to stack on top of it
    z-index: ${euiTheme.levels.menu};
  `,
  header: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.base};
  `,
  footer: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.base};
  `,
};

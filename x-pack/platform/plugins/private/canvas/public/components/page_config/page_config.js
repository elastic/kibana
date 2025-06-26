/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCard,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
  EuiSelect,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { WorkpadColorPicker } from '../workpad_color_picker';

const strings = {
  getBackgroundColorDescription: () =>
    i18n.translate('xpack.canvas.pageConfig.backgroundColorDescription', {
      defaultMessage: 'Accepts HEX, RGB or HTML color names',
    }),
  getBackgroundColorLabel: () =>
    i18n.translate('xpack.canvas.pageConfig.backgroundColorLabel', {
      defaultMessage: 'Background',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.pageConfig.title', {
      defaultMessage: 'Page settings',
    }),
  getTransitionLabel: () =>
    i18n.translate('xpack.canvas.pageConfig.transitionLabel', {
      defaultMessage: 'Transition',
      description:
        'This refers to the transition effect, such as fade in or rotate,  applied to a page in presentation mode.',
    }),
  getTransitionPreviewLabel: () =>
    i18n.translate('xpack.canvas.pageConfig.transitionPreviewLabel', {
      defaultMessage: 'Preview',
      description: 'This is the label for a preview of the transition effect selected.',
    }),
};

export const PageConfig = ({
  pageIndex,
  setBackground,
  background,
  transition,
  transitions,
  setTransition,
}) => {
  return (
    <Fragment>
      <EuiTitle size="xs" className="canvasSidebar__panelTitleHeading">
        <h4>{strings.getTitle()}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        display="columnCompressed"
        label={
          <EuiToolTip content={strings.getBackgroundColorDescription()}>
            <span>
              {strings.getBackgroundColorLabel()} <EuiIcon type="question" color="subdued" />
            </span>
          </EuiToolTip>
        }
      >
        <WorkpadColorPicker onChange={setBackground} value={background} />
      </EuiFormRow>
      {/* No need to show the transition for the first page because transitions occur when
        switching between pages (for example, when moving from the first page to the second
        page, we use the second page's transition) */}
      {pageIndex > 0 ? (
        <Fragment>
          <EuiFormRow label={strings.getTransitionLabel()} display="rowCompressed">
            <EuiSelect
              value={transition ? transition.name : ''}
              options={transitions}
              compressed
              onChange={(e) => setTransition(e.target.value)}
            />
          </EuiFormRow>
          {transition ? (
            <EuiFormRow label={strings.getTransitionPreviewLabel()} display="rowCompressed">
              <EuiCard
                title=""
                description=""
                className={transition.enter}
                style={{
                  height: '72px',
                  width: '128px',
                  background,
                  animationDuration: '1s',
                }}
              />
            </EuiFormRow>
          ) : (
            ''
          )}
        </Fragment>
      ) : (
        ''
      )}
    </Fragment>
  );
};

PageConfig.propTypes = {
  pageIndex: PropTypes.number.isRequired,
  background: PropTypes.string,
  setBackground: PropTypes.func.isRequired,
  transition: PropTypes.shape({
    name: PropTypes.string,
  }),
  transitions: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  setTransition: PropTypes.func.isRequired,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiFormRow, EuiTitle, EuiSpacer, EuiSelect } from '@elastic/eui';
import { WorkpadColorPicker } from '../workpad_color_picker';

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
      <EuiTitle size="xs">
        <h4>Page</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow label="Background color" helpText="Accepts HEX, RGB or HTML Color names">
        <WorkpadColorPicker onChange={setBackground} value={background} />
      </EuiFormRow>
      {/* No need to show the transition for the first page because transitions occur when
        switching between pages (for example, when moving from the first page to the second
        page, we use the second page's transition) */}
      {pageIndex > 0 ? (
        <div>
          <EuiFormRow label="Transition" compressed>
            <EuiSelect
              value={transition ? transition.name : ''}
              options={transitions}
              onChange={e => setTransition(e.target.value)}
            />
          </EuiFormRow>
          {transition ? (
            <EuiFormRow label="Preview">
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
        </div>
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

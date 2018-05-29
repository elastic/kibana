/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

// TODO: Remove once EUI has typing for EuiFlyoutBody
declare module '@elastic/eui' {
  export const EuiFlyoutBody: React.SFC<any>;
}

import { EuiFlyoutBody } from '@elastic/eui';

/**
 * The InspectorView component should be the top most element in every implemented
 * inspector view. It makes sure, that the appropriate stylings are applied to the
 * view.
 */
const InspectorView: React.SFC<{ useFlex?: boolean }> = ({
  useFlex,
  children,
}) => {
  const classes = classNames({
    'inspector-view__flex': Boolean(useFlex),
  });
  return <EuiFlyoutBody className={classes}>{children}</EuiFlyoutBody>;
};

InspectorView.propTypes = {
  /**
   * Set to true if the element should have display: flex set.
   */
  useFlex: PropTypes.bool,
};

export { InspectorView };

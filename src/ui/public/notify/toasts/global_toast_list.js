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

import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';

import {
  EuiGlobalToastList,
  EuiPortal,
} from '@elastic/eui';

export class GlobalToastList extends Component {
  constructor(props) {
    super(props);

    if (this.props.subscribe) {
      this.props.subscribe(() => this.forceUpdate());
    }
  }

  static propTypes = {
    subscribe: PropTypes.func,
    toasts: PropTypes.array,
    dismissToast: PropTypes.func.isRequired,
    toastLifeTimeMs: PropTypes.number.isRequired,
  };

  render() {
    const {
      toasts,
      dismissToast,
      toastLifeTimeMs,
    } = this.props;

    return (
      <EuiPortal>
        <EuiGlobalToastList
          toasts={toasts}
          dismissToast={dismissToast}
          toastLifeTimeMs={toastLifeTimeMs}
        />
      </EuiPortal>
    );
  }
}

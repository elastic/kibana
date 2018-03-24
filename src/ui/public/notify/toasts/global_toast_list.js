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

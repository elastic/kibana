import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';

import {
  EuiGlobalToastList,
  EuiGlobalToastListItem,
  EuiToast,
} from '@elastic/eui';

export const TOAST_FADE_OUT_MS = 250;

export class GlobalToastList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      toastIdToDismissedMap: {}
    };

    this.timeoutIds = [];
    this.toastIdToScheduledForDismissalMap = {};

    if (this.props.subscribe) {
      this.props.subscribe(() => this.forceUpdate());
    }
  }

  static propTypes = {
    toasts: PropTypes.array,
    subscribe: PropTypes.func,
    dismissToast: PropTypes.func.isRequired,
    toastLifeTimeMs: PropTypes.number.isRequired,
  };

  static defaultProps = {
    toasts: [],
  };

  scheduleAllToastsForDismissal = () => {
    this.props.toasts.forEach(toast => {
      if (!this.toastIdToScheduledForDismissalMap[toast.id]) {
        this.scheduleToastForDismissal(toast);
      }
    });
  };

  scheduleToastForDismissal = (toast, isImmediate = false) => {
    this.toastIdToScheduledForDismissalMap[toast.id] = true;
    const toastLifeTimeMs = isImmediate ? 0 : this.props.toastLifeTimeMs;

    // Start fading the toast out once its lifetime elapses.
    this.timeoutIds.push(setTimeout(() => {
      this.startDismissingToast(toast);
    }, toastLifeTimeMs));

    // Remove the toast after it's done fading out.
    this.timeoutIds.push(setTimeout(() => {
      this.props.dismissToast(toast);
      this.setState(prevState => {
        const toastIdToDismissedMap = { ...prevState.toastIdToDismissedMap };
        delete toastIdToDismissedMap[toast.id];
        delete this.toastIdToScheduledForDismissalMap[toast.id];

        return {
          toastIdToDismissedMap,
        };
      });
    }, toastLifeTimeMs + TOAST_FADE_OUT_MS));
  };

  startDismissingToast(toast) {
    this.setState(prevState => {
      const toastIdToDismissedMap = {
        ...prevState.toastIdToDismissedMap,
        [toast.id]: true,
      };

      return {
        toastIdToDismissedMap,
      };
    });
  }

  componentDidMount() {
    this.scheduleAllToastsForDismissal();
  }

  componentWillUnmount() {
    this.timeoutIds.forEach(clearTimeout);
  }

  componentDidUpdate() {
    this.scheduleAllToastsForDismissal();
  }

  render() {
    const {
      toasts,
    } = this.props;

    const renderedToasts = toasts.map(toast => {
      const {
        text,
        ...rest
      } = toast;

      return (
        <EuiGlobalToastListItem
          key={toast.id}
          isDismissed={this.state.toastIdToDismissedMap[toast.id]}
        >
          <EuiToast
            onClose={this.scheduleToastForDismissal.bind(toast, true)}
            {...rest}
          >
            {text}
          </EuiToast>
        </EuiGlobalToastListItem>
      );
    });

    return (
      <EuiGlobalToastList>
        {renderedToasts}
      </EuiGlobalToastList>
    );
  }
}

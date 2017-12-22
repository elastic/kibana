import React, {
  // cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';
import 'ngreact';
import { uiModules } from 'ui/modules';

import {
  EuiGlobalToastList,
  EuiGlobalToastListItem,
  EuiToast,
} from '@elastic/eui';

const TOAST_LIFE_TIME_MS = 4000;
const TOAST_FADE_OUT_MS = 250;

class GlobalToastList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      toastIdToDismissedMap: {}
    };

    this.timeoutIds = [];
    this.toastsScheduledForDismissal = {};
  }

  static propTypes = {
    toasts: PropTypes.array,
    dismissToast: PropTypes.func.isRequired,
  };

  static defaultProps = {
    toasts: [],
  };

  scheduleToastForDismissal = (toast, isImmediate = false) => {
    const lifeTime = isImmediate ? TOAST_FADE_OUT_MS : TOAST_LIFE_TIME_MS;

    this.timeoutIds.push(setTimeout(() => {
      this.props.dismissToast(toast);
      this.setState(prevState => {
        const toastIdToDismissedMap = { ...prevState.toastIdToDismissedMap };
        delete toastIdToDismissedMap[toast.id];

        return {
          toastIdToDismissedMap,
        };
      });
    }, lifeTime));

    this.timeoutIds.push(setTimeout(() => {
      this.startDismissingToast(toast);
    }, lifeTime - TOAST_FADE_OUT_MS));
  };

  startDismissingToast(toast) {
    this.setState(prevState => {
      const toastIdToDismissedMap = { ...prevState.toastIdToDismissedMap };
      toastIdToDismissedMap[toast.id] = true;

      return {
        toastIdToDismissedMap,
      };
    });
  }

  componentWillUnmount() {
    this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  }

  componentDidUpdate(prevProps) {
    prevProps.toasts.forEach(toast => {
      if (!this.toastsScheduledForDismissal[toast.id]) {
        this.scheduleToastForDismissal(toast);
      }
    });
  }

  render() {
    const {
      toasts,
    } = this.props;

    const renderedToasts = toasts.map(toast => {
      const {
        title,
        text,
        iconType,
        color,
        ...rest
      } = toast;

      return (
        <EuiGlobalToastListItem
          key={toast.id}
          isDismissed={this.state.toastIdToDismissedMap[toast.id]}
        >
          <EuiToast
            title={title}
            text={text}
            iconType={iconType}
            color={color}
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

const app = uiModules.get('app/kibana', ['react']);

app.directive('globalToastList', function (reactDirective) {
  return reactDirective(GlobalToastList, [
    'toasts',
    ['dismissToast', { watchDepth: 'reference' }],
  ]);
});

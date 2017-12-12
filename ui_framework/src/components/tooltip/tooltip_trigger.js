import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { KuiTooltip } from './tooltip';
import { SIZE } from './tooltip_constants';
import { noOverflowPlacement } from '../../services';

export class KuiTooltipTrigger extends React.Component {
  static propTypes = {
    display: PropTypes.bool,
    title: PropTypes.string,
    tooltip: PropTypes.oneOfType([PropTypes.node, PropTypes.object]).isRequired,
    placement: PropTypes.oneOf(['left', 'right', 'bottom', 'top']),
    trigger: PropTypes.oneOf(['manual', 'hover', 'click']),
    clickHideDelay: PropTypes.number,
    onClick: PropTypes.func,
    onEntered: PropTypes.func,
    onExited: PropTypes.func,
    theme: PropTypes.oneOf(['dark', 'light']),
    size: PropTypes.oneOf([SIZE.AUTO, SIZE.SMALL, SIZE.MEDIUM, SIZE.LARGE]),
    isSticky: PropTypes.bool
  };

  static defaultProps = {
    display: false,
    placement: 'top',
    trigger: 'hover',
    clickHideDelay: 1000,
    onClick: () => {},
    onEntered: () => {},
    onExited: () => {},
    theme: 'dark',
    size: SIZE.AUTO,
    isSticky: false
  };

  constructor(props) {
    super(props);
    const openOnLoad = props.trigger === 'manual' ? props.display : false;
    this.state = {
      isVisible: openOnLoad,
      noOverflowPlacement: props.placement
    };
    this.clickHandler = this.clickHandler.bind(this);
  }

  getPlacement() {
    const domNode = ReactDOM.findDOMNode(this);
    const tooltipContainer = domNode.getElementsByClassName('kuiTooltip-container')[0];
    const userPlacement = this.props.placement;
    const WINDOW_BUFFER = 8;
    return noOverflowPlacement(domNode, tooltipContainer, userPlacement, WINDOW_BUFFER);
  }

  hoverHandler(e) {
    this.setState({
      isVisible: e.type === 'mouseenter',
      noOverflowPlacement: this.getPlacement()
    });
  }

  clickHandler(e, onClick) {
    this.setState({
      isVisible: true,
      noOverflowPlacement: this.getPlacement()
    });
    onClick(e);
    setTimeout(() => {
      this.setState({ isVisible: false });
    }, this.props.clickHideDelay);
  }

  componentWillReceiveProps(nextProps) {
    const triggerChanged = this.props.trigger !== nextProps.trigger;
    const displayChanged = this.props.display !== nextProps.display;

    if (triggerChanged && nextProps.trigger === 'manual') {
      this.setState({ isVisible: nextProps.display });
    } else if (triggerChanged) {
      this.setState({ isVisible: false });
    } else if (displayChanged) {
      this.setState({ isVisible: nextProps.display });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevState.isVisible && !this.state.isVisible) {
      this.props.onExited();
    } else if(!prevState.isVisible && this.state.isVisible) {
      this.props.onEntered();
    }
  }

  getTriggerHandler(trigger, onClick) {
    switch(trigger) {
      case 'click':
        return { onClick: e => this.clickHandler(e, onClick) };
      case 'manual':
        return {};
      default:
        return {
          onClick,
          onMouseEnter: this.hoverHandler.bind(this),
          onMouseLeave: this.hoverHandler.bind(this)
        };
    }
  }

  render() {
    const {
      isSticky,
      title,
      tooltip,
      trigger,
      className,
      clickHideDelay, // eslint-disable-line no-unused-vars
      onEntered, // eslint-disable-line no-unused-vars
      onExited, // eslint-disable-line no-unused-vars
      theme,
      size,
      onClick,
      display, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;
    const { isVisible } = this.state;

    const triggerHandler = this.getTriggerHandler(trigger, onClick);

    const newClasses = classnames('kuiTooltip', className, {
      'kuiTooltip-light': theme === 'light',
      [`kuiTooltip-${this.state.noOverflowPlacement}`]: this.state.noOverflowPlacement !== 'top'
    });
    const newProps = {
      className: newClasses,
      ...triggerHandler,
      ...rest
    };
    const tooltipProps = { isSticky, size, isVisible, title };

    return (
      <div {...newProps}>
        {this.props.children}
        <KuiTooltip {...tooltipProps}>{tooltip}</KuiTooltip>
      </div>
    );
  }
}

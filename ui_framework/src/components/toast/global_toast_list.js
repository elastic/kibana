import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class KuiGlobalToastList extends Component {
  constructor(props) {
    super(props);

    this.isScrollingToBottom = false;
    this.isScrolledToBottom = true;
    this.onScroll = this.onScroll.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  startScrollingToBottom() {
    this.isScrollingToBottom = true;

    const scrollToBottom = () => {
      const position = this.listElement.scrollTop;
      const destination = this.listElement.scrollHeight - this.listElement.clientHeight;
      const distanceToDestination = destination - position;

      if (distanceToDestination < 5) {
        this.listElement.scrollTop = destination;
        this.isScrollingToBottom = false;
        this.isScrolledToBottom = true;
        return;
      }

      this.listElement.scrollTop = position + distanceToDestination * 0.25;

      if (this.isScrollingToBottom) {
        window.requestAnimationFrame(scrollToBottom);
      }
    };

    window.requestAnimationFrame(scrollToBottom);
  }

  onMouseEnter() {
    // Stop scrolling to bottom if we're in mid-scroll, because the user wants to interact with
    // the list.
    this.isScrollingToBottom = false;
    this.isUserInteracting = true;
  }

  onMouseLeave() {
    this.isUserInteracting = false;
  }

  onScroll() {
    this.isScrolledToBottom =
      this.listElement.scrollHeight - this.listElement.scrollTop === this.listElement.clientHeight;
  }

  componentDidMount() {
    this.listElement.addEventListener('scroll', this.onScroll);
    this.listElement.addEventListener('mouseenter', this.onMouseEnter);
    this.listElement.addEventListener('mouseleave', this.onMouseLeave);
  }

  componentDidUpdate(prevProps) {
    if (!this.isUserInteracting) {
      // If the user has scrolled up the toast list then we don't want to annoy them by scrolling
      // all the way back to the bottom.
      if (this.isScrolledToBottom) {
        if (prevProps.children.length < this.props.children.length) {
          this.startScrollingToBottom();
        }
      }
    }
  }

  componentWillUnmount() {
    this.listElement.removeEventListener('scroll', this.onScroll);
    this.listElement.removeEventListener('mouseenter', this.onMouseEnter);
    this.listElement.removeEventListener('mouseleave', this.onMouseLeave);
  }

  render() {
    const {
      children,
      className,
      ...rest,
    } = this.props;

    const classes = classNames('kuiGlobalToastList', className);

    return (
      <div
        ref={element => { this.listElement = element; }}
        className={classes}
        {...rest}
      >
        {children}
      </div>
    );
  }
}

KuiGlobalToastList.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

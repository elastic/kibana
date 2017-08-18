import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../icon';

import {
  KuiPopoverTitle,
  KuiFormRow,
  KuiSwitch,
  KuiButton,
} from '../../components';

export class KuiContextMenu extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    navItems: PropTypes.object,
  }

  componentDidMount(){
    let { clientHeight } = this.refs.previous;
    this.setState({height: clientHeight});
  }

  constructor(props) {
    super(props);

    this.state = {
      showNext: false,
      showCurrent: false,
      showPrevious: true,
      title: null,
      previousItems: [
        {text: 'Show fullscreen', icon: 'user', id: 1},
        {text: 'Share this dasbhoard', icon: 'user', id: 2, next: true},
        {text: 'Edit / add panels', icon: 'user', id: 3},
        {text: 'Display options', icon: 'user', id: 4},
      ],
      currentItems: [
        {text: 'Share this dashboard', icon: 'arrowLeft', id: 1, previous: true},
        {text: 'PDF reports', icon: 'user', id: 2},
        {text: 'CSV reports', icon: 'user', id: 3},
        {text: 'Embed code', icon: 'user', id: 4, next: true},
        {text: 'Permalinks', icon: 'user', id: 5},
      ],
      nextItems: [
        {text: 'Embed code', icon: 'arrowLeft', id: 1, previous: true},
      ],
    };
  }

  showNext() {
    let { clientHeight } = this.refs.next;

    this.setState({
      height: clientHeight,
      showNext: true,
      showCurrent: false,
      showPrevious: false,
    });
  }

  showPrevious() {
    let { clientHeight } = this.refs.previous;

    this.setState({
      height: clientHeight,
      showNext: false,
      showCurrent: false,
      showPrevious: true,
    });
  }

  showCurrent() {
    let { clientHeight } = this.refs.current;

    this.setState({
      height: clientHeight,
      showNext: false,
      showCurrent: true,
      showPrevious: false,
    });
  }


  render() {
    const {
      children,
      className,
      ...rest,
    } = this.props;

    const classes = classNames('kuiContextMenu', className);

    let styles = {
      height: this.state.height,
    }

    const previousClasses = classNames(
      'kuiContextMenu__panel',
      {
        'kuiContextMenu__panel--previous': this.state.showCurrent || this.state.showNext,
      },
    );

    const currentClasses = classNames(
      'kuiContextMenu__panel',
      {
        'kuiContextMenu__panel--previous': this.state.showNext,
        'kuiContextMenu__panel--next': this.state.showPrevious,
      },
    );

    const nextClasses = classNames(
      'kuiContextMenu__panel',
      {
        'kuiContextMenu__panel--next': this.state.showCurrent || this.state.showPrevious,
      },
    );

    return (

      <div
        className={classes}
        style={styles}
        {...rest}
      >
        <div ref="previous" className={previousClasses}>
          {this.state.previousItems.map((option, index) => {
            let buttonClasses = classNames(
              'kuiContextMenu__option',
              {
                'kuiContextMenu__option--previous': option.previous,
              },
            )

            let button = null;
            if (option.next) {
              button = (
                <button className={buttonClasses} key={option.id} onClick={this.showCurrent.bind(this)}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                  <KuiIcon type="arrowRight" size="medium" className="kuiContextMenu__arrow" />
                </button>
              );
            } else {
              button = (
                <button className={buttonClasses} key={option.id}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                </button>
              );
            }

            return (
              <div>{button}</div>
            );
          })}
        </div>
        <div ref="current" className={currentClasses}>
          {this.state.currentItems.map((option, index) => {
            let buttonClasses = classNames(
              'kuiContextMenu__option',
              {
                'kuiContextMenu__option--previous': option.previous,
              },
            )

            let button = null;
            if (option.next) {
              button = (
                <button className={buttonClasses} key={option.id} onClick={this.showNext.bind(this)}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                  <KuiIcon type="arrowRight" size="medium" className="kuiContextMenu__arrow" />
                </button>
              );
            } else if (option.previous) {
              button = (
                <button className={buttonClasses} key={option.id} onClick={this.showPrevious.bind(this)}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                </button>
              );
            } else {
              button = (
                <button className={buttonClasses} key={option.id}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                </button>
              );
            }

            return (
              <div>{button}</div>
            );
          })}
        </div>
        <div ref="next" className={nextClasses}>
          {this.state.nextItems.map((option, index) => {
            let buttonClasses = classNames(
              'kuiContextMenu__option',
              {
                'kuiContextMenu__option--previous': option.previous,
              },
            )

            let button = null;
            if (option.previous) {
              button = (
                <button className={buttonClasses} key={option.id} onClick={this.showCurrent.bind(this)}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                </button>
              );
            } else {
              button = (
                <button className={buttonClasses} key={option.id}>
                  <KuiIcon type={option.icon} size="medium" className="kuiContextMenu__icon" />
                  <span className="kuiContextMenu__text">{option.text}</span>
                </button>
              );
            }

            return (
              <div>{button}</div>
            );
          })}
          <div style={{padding: 16}}>
            <KuiFormRow
              label="Generate a public snapshot?"
            >
              <KuiSwitch
                name="switch"
                id="asdf"
                label="Snapshot data"
              />
            </KuiFormRow>
            <KuiFormRow
              label="Include the following in the embed"
            >
              <KuiSwitch
                name="switch"
                id="asdf2"
                label="Current time range"
              />
            </KuiFormRow>
            <KuiButton fill>Copy iFrame code</KuiButton>
          </div>
        </div>
      </div>
    );
  }
}

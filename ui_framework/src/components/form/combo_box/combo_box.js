import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiText,
  KuiTextColor,
  KuiPanel,
  KuiComboBoxPill,
  KuiComboBoxRow,
  KuiFormControlLayout,
  KuiValidatableControl,
  KuiOutsideClickDetector,
} from '../../../components';

export class KuiComboBox extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
  }

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: this.props.isPopoverOpen,
      value: '',
      matches: this.props.options,
      focusedRow: -1,
    };

    this.handleSearchInputFocus = this.handleSearchInputFocus.bind(this);
    this.handleShowPopover = this.handleShowPopover.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isPopoverOpen !== this.state.isPopoverOpen) {
      this.setState({ isPopoverOpen: nextProps.isPopoverOpen });
    }
  }

  handleSearchInputFocus() {
    this.searchInput.focus();
  }

  handleShowPopover() {
    this.setState({
      isPopoverOpen: true,
    });
  }

  filterItems(query) {
    return this.props.options.filter(function(option) {
      return option.text.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
  }

  handleChange(event) {
    this.setState({
      value: event.target.value,
    });
  }

  handleClosePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  handleKeyDown(e) {
    switch (e.keyCode) {
      case 40: // Down
        this.focusRowNext();
        break;
      case 38: // Up
        break;
      case 8: // Backspace
        break;
      case 13: // Enter
        break;
    }
  }

  focusRowNext() {

    let rowIndex;
    if (this.state.focusedRow >= this.props.options.length - 1) {
      rowIndex = this.props.options.length - 1;
    } else {
      rowIndex = this.props.focusedRow + 1;
    }

    this.setState({
      focusedRow: rowIndex,
    });
  }

  render() {
    const {
      children,
      options,
      isInvalid,
      isPopoverOpen,
      className,
      closePopover,
      selectedOptions,
      optionTypeName,
      ...rest,
    } = this.props;

    const searchString = this.state.value.toLowerCase();

    const matches =
      this.props.options.filter(option => (
        option.text.toLowerCase().indexOf(searchString) !== -1
      )).map((option, index) => {
        return (
          <KuiComboBoxRow value={option.value} key={index}>{option.text}</KuiComboBoxRow>
        );
      });

    const exactMatches = this.props.options.filter(function (option) {
      return (option.text.toLowerCase() === searchString);
    });

    let matchesOrEmpty = null;
    if (matches.length === 0) {
      matchesOrEmpty = (
        <div className="kuiComoboBox__empty">
          No {optionTypeName} matches your search.
        </div>
      );
    } else {
      matchesOrEmpty = matches;
    }

    const classes = classNames(
      'kuiComboBox',
      {
        'kuiComboBox-isOpen': this.state.isPopoverOpen,
      },
      className
    );

    const panelClasses = classNames(
      'kuiComboBox__panel',
    );

    let footer = null;

    if ((exactMatches.length === 0) && (searchString !== '')) {
      footer = (
        <div className="kuiComboBox__footer">
          <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <KuiFlexItem grow={false}>
              <KuiText size="small">
                <KuiTextColor color="subdued">
                  Not listed?
                </KuiTextColor>
              </KuiText>
            </KuiFlexItem>
            <KuiFlexItem grow={false}>
              <KuiButton size="small">Add {this.state.value}</KuiButton>
            </KuiFlexItem>
          </KuiFlexGroup>
        </div>
      );
    } else if (searchString === '') {
      footer = (
        <div className="kuiComboBox__footer">
          <KuiText size="small">
            <KuiTextColor color="subdued">
              Start typing to add a new {optionTypeName}.
            </KuiTextColor>
          </KuiText>
        </div>
      );
    }

    return (
      <KuiOutsideClickDetector onOutsideClick={closePopover}>
        <div
          className={classes}
          {...rest}
        >
          <KuiFormControlLayout
            icon="arrowDown"
            iconSide="right"
          >
            <div
              className="kuiComboBox__inputWrap"
              onClick={this.handleSearchInputFocus}
            >
              {selectedOptions.map((option, index) => {
                return <KuiComboBoxPill key={index}>{option.text}</KuiComboBoxPill>;
              })}

              <KuiValidatableControl isInvalid={isInvalid}>
                <input
                  type="search"
                  className="kuiComboBox__input"
                  onFocus={this.handleShowPopover}
                  value={this.state.value}
                  onChange={this.handleChange}
                  onKeyDown={this.handleKeyDown}
                  ref={(input) => { this.searchInput = input; }}
                />
              </KuiValidatableControl>
            </div>
          </KuiFormControlLayout>
          <KuiPanel paddingSize="none" className={panelClasses}>
            <div className="kuiComboBox__rowWrap">
              {matchesOrEmpty}
            </div>
            {footer}
          </KuiPanel>
        </div>
      </KuiOutsideClickDetector>
    );
  }
}

KuiComboBox.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  options: PropTypes.arrayOf(React.PropTypes.object).isRequired,
  selectedOptions: PropTypes.arrayOf(React.PropTypes.object).isRequired,
  isInvalid: PropTypes.bool,
  isPopoverOpen: PropTypes.bool,
};

KuiComboBox.defaultProps = {
  options: [],
  selectedOptions: [],
};

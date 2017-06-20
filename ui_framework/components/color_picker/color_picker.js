import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { ChromePicker } from 'react-color';

import { KuiColorPickerSwatch } from './color_picker_swatch';

export class KuiColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showColorSelector: false,
    };
  }

  closeColorSelector = () => {
    this.setState({ showColorSelector: false });
  };

  toggleColorSelector = () => {
    this.setState({ showColorSelector: !this.state.showColorSelector });
  };

  handleColorSelection = (color) => {
    this.props.onChange(color.hex);
  };

  onClickRootElement = e => {
    // This prevents clicking on the element from closing it, due to the event handler on the
    // document object.
    if (e.nativeEvent.stopImmediatePropagation) {  // Not available in headless browsers (e.g. jenkins ci build).
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  onClearColor = (event) => {
    this.props.onChange(null);
    event.stopPropagation();
    this.closeColorSelector();
  };

  componentDidMount() {
    // When the user clicks somewhere outside of the color picker, we will dismiss it.
    document.addEventListener('click', this.closeColorSelector);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.closeColorSelector);
  }

  getColorLabel() {
    const { color } = this.props;
    return (
      <div
        className="kuiColorPicker__label"
        aria-label={`Color selection is ${ color }`}
      >
        { color }
      </div>
    );
  }

  getClearLink() {
    return (
      <a className="kuiLink kuiColorPicker__label" onClick={ this.onClearColor }>clear</a>
    );
  }

  render() {
    const { color, className, label, showColorLabel, showClearLink } = this.props;
    const classes = classNames('kuiColorPicker', className);
    return (
      <div
        className={ classes }
        data-test-subj={ this.props['data-test-subj'] }
        onClick={ this.onClickRootElement }
      >
        <div
          className="kuiColorPicker__preview"
          onClick={ this.toggleColorSelector }
        >
          <label className="kuiLabel kuiColorPicker__label">
            { label }
          </label>
          <KuiColorPickerSwatch color={ color } aria-label={ this.props['aria-label'] } />
          { showColorLabel ? this.getColorLabel() : null }
          { showClearLink ? this.getClearLink() : null }
        </div>
        {
          this.state.showColorSelector ?
            <div className="kuiColorPickerPopUp" data-test-subj="colorPickerPopup">
              <ChromePicker
                color={ color ? color : '#ffffff' }
                disableAlpha={ true }
                onChange={ this.handleColorSelection }
              />
            </div>
            : null
        }
      </div>
    );
  }
}

KuiColorPicker.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  showColorLabel: PropTypes.bool,
  showClearLink: PropTypes.bool,
  label: PropTypes.string,
};

KuiColorPicker.defaultProps = {
  'aria-label': 'Select a color',
  showColorLabel: true,
  showClearLink: false
};

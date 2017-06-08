import React from 'react';
import PropTypes from 'prop-types';

import { ChromePicker } from 'react-color';

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

  render() {
    const color = this.props.color || '#ffffff';
    return (
      <div
        className={ this.props.className }
        aria-label={ this.props['aria-label'] }
        data-test-subj={ this.props['data-test-subj'] }
      >
        <div
          className="kuiColorSwatch"
          aria-label="Select a color"
          data-test-subj="colorSwatch"
          style={{ background: this.props.color }}
          onClick={ this.toggleColorSelector }
        />
        {
          this.state.showColorSelector ?
            <div className="kuiColorPickerPopUp" data-test-subj="colorPickerPopup">
              <div className="kuiColorPickerCover" onClick={ this.closeColorSelector } />
              <ChromePicker
                color={ color }
                disableAlpha={ true }
                onChange={ this.handleColorSelection }
              />
            </div>
            : null
        }
        <div
          className="kuiColorLabel"
          aria-label={`Color selection is ${color}`}
        >
          { color }
        </div>
      </div>
    );
  }
}

KuiColorPicker.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

KuiColorPicker.defaultProps = {
  color: '#ffffff'
};

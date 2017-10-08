import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiCheckBox,
  KuiCheckBoxLabel
} from '../../../../components';


class KuiCheckBoxExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value1:false,
      value2:true,
      value3:true,
      value4:false,
    };
  }

  handleChange = (event, key) => {
    this.setState({ [key]:event.target.checked });
  }

  render() {
    return (
      <div>
        <KuiCheckBox
          isChecked={this.state.value1}
          onChange={event => this.handleChange(event,'value1')}
        />
        <hr className="guideBreak"/>
        <KuiCheckBox
          isChecked={this.state.value2}
          onChange={event => this.handleChange(event,'value2')}
        />
        <hr className="guideBreak"/>
        <KuiCheckBox
          isChecked={this.state.value3}
          onChange={event => this.handleChange(event,'value3')}
          isDisabled
        />
        <hr className="guideBreak"/>
        <KuiCheckBoxLabel
          text="With clickable label"
          isChecked={this.state.value4}
          onChange={event => this.handleChange(event,'value4')}
        />
      </div>
    );
  }
}

export default KuiCheckBoxExample;

import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTextInput,
} from '../../../../components';


class KuiTextInputExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value1:'',
      value2:'Entered text',
      value3:'',
      value4:'Disabled',
      value5:'',
      value6:'',
    };
  }

  handleChange = (event, key) => {
    this.setState({ [key]:event.target.value });
  }

  render() {
    const id = this.props.id;
    const labelStyle = {
      marginLeft: '8px',
      fontWeight: 'normal'
    };

    return (
      <div>
        <KuiTextInput
          value={this.state.value1}
          placeholder="Placeholder text"
          onChange={event => this.handleChange(event,'value1')}
        />
        <hr className="guideBreak"/>
        <KuiTextInput
          value={this.state.value2}
          autoFocus
          onChange={event => this.handleChange(event,'value2')}
        />
        <hr className="guideBreak"/>
        <KuiTextInput
          value={this.state.value3}
          isInvalid
          onChange={event => this.handleChange(event,'value3')}
        />
        <hr className="guideBreak"/>
        <KuiTextInput
          value={this.state.value4}
          isDisabled
          onChange={event => this.handleChange(event,'value4')}
        />
        <hr className="guideBreak"/>
        <KuiTextInput
          value={this.state.value5}
          size="small"
          placeholder="Small"
          onChange={event => this.handleChange(event,'value5')}
        />
        <hr className="guideBreak"/>
        <KuiTextInput
          value={this.state.value6}
          size="large"
          placeholder="Large"
          onChange={event => this.handleChange(event,'value6')}
        />
      </div>
    );
  }
}

KuiTextInputExample.propTypes = {
  id: PropTypes.string.isRequired
};

export default KuiTextInputExample;

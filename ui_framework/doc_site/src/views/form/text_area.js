import React, {
  Component,
} from 'react';
import {
  KuiTextArea,
} from '../../../../components';

class KuiTextAreaExample extends Component {
  state = {
    value1: '',
    value2: 'Entered text',
    value3: '',
    value4: 'Disabled',
    value5: '',
    value6: '',
  };

  handleChange = (event, key) => {
    this.setState({ [key]: event.target.value });
  }

  render() {
    return (
      <div>
        <KuiTextArea
          placeholder="Placeholder text"
          value={this.state.value1}
          onChange={event => this.handleChange(event, 'value1')}
        />
        <hr className="guideBreak"/>
        <KuiTextArea
          value={this.state.value2}
          onChange={event => this.handleChange(event, 'value2')}
        />
        <hr className="guideBreak"/>
        <KuiTextArea
          isInvalid
          value={this.state.value3}
          onChange={event => this.handleChange(event, 'value3')}
        />
        <hr className="guideBreak"/>
        <KuiTextArea
          isDisabled
          value={this.state.value4}
          onChange={event => this.handleChange(event, 'value4')}
        />
        <hr className="guideBreak"/>
        <KuiTextArea
          placeholder="Small"
          value={this.state.value5}
          size="small"
          onChange={event => this.handleChange(event, 'value5')}
        />
        <hr className="guideBreak"/>
        <KuiTextArea
          placeholder="Large"
          value={this.state.value6}
          size="large"
          onChange={event => this.handleChange(event, 'value6')}
        />
      </div>
    );
  }
}

export default KuiTextAreaExample;


import React, {
  Component,
} from 'react';

import {
  KuiComboBox,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    return (
      <KuiComboBox
        optionTypeName="Dota 2 character"
        options={[
          { value: 'Ancient Apparition', text: 'Ancient Apparition' },
          { value: 'Dazzle', text: 'Dazzle' },
          { value: 'Disruptor', text: 'Disruptor' },
          { value: 'Doom', text: 'Doom' },
          { value: 'Dragon Knight', text: 'Dragon Knight' },
          { value: 'Drow', text: 'Drow' },
          { value: 'Earthshaker', text: 'Earthshaker' },
          { value: 'Ember Spirit', text: 'Ember Spirit' },
          { value: 'Juggernaut', text: 'Juggernaut' },
          { value: 'Lion', text: 'Lion' },
          { value: 'Skywrath Mage', text: 'Skywrath Mage' },
        ]}
        selectedOptions={[
          { value: 'option_one', text: 'Tidehunter' },
          { value: 'option_two', text: 'Wisp' },
        ]}
        isPopoverOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      />
    );
  }
}

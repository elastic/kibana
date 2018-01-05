import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
        Show popover
      </KuiButton>
    );

    return (
      <KuiPopover
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      >
        <div style={{ width: '300px' }}>
          <div className="kuiVerticalRhythmSmall">
            <KuiFieldGroup>
              <KuiFieldGroupSection isWide>
                <div className="kuiSearchInput">
                  <div className="kuiSearchInput__icon kuiIcon fa-search" />
                  <input
                    className="kuiSearchInput__input"
                    type="text"
                  />
                </div>
              </KuiFieldGroupSection>

              <KuiFieldGroupSection>
                <select className="kuiSelect">
                  <option>Animal</option>
                  <option>Mineral</option>
                  <option>Vegetable</option>
                </select>
              </KuiFieldGroupSection>
            </KuiFieldGroup>
          </div>

          <div className="kuiVerticalRhythmSmall">
            <KuiButton buttonType="primary">Save</KuiButton>
          </div>
        </div>
      </KuiPopover>
    );
  }
}

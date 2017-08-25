import React, {
  Component,
} from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiFormRow,
  KuiButton,
  KuiFieldNumber,
  KuiCheckboxGroup,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
  KuiText,
  KuiHorizontalRule,
} from '../../../../components/';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSwitchChecked: false,
      checkboxes: [{
        id: `${idPrefix}0`,
        label: 'Red',
      }, {
        id: `${idPrefix}1`,
        label: 'Blue is checked by default',
      }, {
        id: `${idPrefix}2`,
        label: 'Green',
      }, {
        id: `${idPrefix}3`,
        label: 'Purple',
      }],
      checkboxIdToSelectedMap: {
        [`${idPrefix}1`]: true,
      },
    };
  }

  onCheckboxChange = option => {
    const newCheckboxIdToSelectedMap = Object.assign({}, this.state.checkboxIdToSelectedMap, {
      [option.id]: !this.state.checkboxIdToSelectedMap[option.id],
    });

    this.setState({
      checkboxIdToSelectedMap: newCheckboxIdToSelectedMap,
    });
  }

  render() {
    return (
      <KuiPageBody>
        <KuiPageContent verticalPosition="center" horizontalPosition="center" style={{ width: 600 }}>
          <KuiPageContentHeader>
            <KuiPageContentHeaderSection>
              <KuiTitle>
                <h2>Don&rsquo;t overload inline forms with vertical content</h2>
              </KuiTitle>
            </KuiPageContentHeaderSection>
          </KuiPageContentHeader>
          <KuiPageContentBody>
            <KuiText>
              <p>
                Inline forms are great for saving space but fall apart when
                you use bulky items or try to stack too much in them. If the items
                don&rsquo;t line up on a horizontal line, then you should probably stick with
                a simple vertical form.
              </p>
            </KuiText>
            <KuiHorizontalRule />
            <KuiFlexGroup>
              <KuiFlexItem grow={false} style={{ width: 100 }}>
                <KuiFormRow label="Age"  id={idPrefix}>
                  <KuiFieldNumber max={10} placeholder={42} />
                </KuiFormRow>
              </KuiFlexItem>
              <KuiFlexItem>
                <KuiFormRow
                  id={makeId()}
                  label="Checkboxes"
                >
                  <KuiCheckboxGroup
                    options={this.state.checkboxes.map(checkbox => Object.assign({}, checkbox, {
                      checked: this.state.checkboxIdToSelectedMap[checkbox.id],
                    }))}
                    onChange={this.onCheckboxChange}
                  />
                </KuiFormRow>
              </KuiFlexItem>
              <KuiFlexItem grow={false}>
                <KuiFormRow hasEmptyLabelSpace>
                  <KuiButton>Save</KuiButton>
                </KuiFormRow>
              </KuiFlexItem>
            </KuiFlexGroup>
          </KuiPageContentBody>
        </KuiPageContent>
      </KuiPageBody>
    );
  }
}

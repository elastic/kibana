import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiExpression,
  KuiExpressionButton,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiPopover,
  KuiPopoverTitle,
} from '../../../../components';


class KuiExpressionItemExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      example1: {
        isOpen: false,
        value: 'count()'
      },
      example2: {
        object: 'A',
        value: '100',
        description: 'Is above'
      },
    };
  }

  openExample1 = () => {
    this.setState({
      example1: {
        ...this.state.example1,
        isOpen: true,
      },
      example2: {
        ...this.state.example2,
        isOpen: false,
      },
    });
  };

  closeExample1 = () => {
    this.setState({
      example1: {
        ...this.state.example1,
        isOpen: false,
      },
    });
  };

  openExample2 = () => {
    this.setState({
      example1: {
        ...this.state.example1,
        isOpen: false,
      },
      example2: {
        ...this.state.example2,
        isOpen: true,
      },
    });
  };

  closeExample2 = () => {
    this.setState({
      example2: {
        ...this.state.example2,
        isOpen: false,
      },
    });
  };

  changeExample1 = (event) => {
    this.setState({ example1: { ...this.state.example1, value: event.target.value } });
  }

  changeExample2Object = (event) => {
    this.setState({ example2: { ...this.state.example2, object: event.target.value } });
  }

  changeExample2Value = (event) => {
    this.setState({ example2: { ...this.state.example2, value: event.target.value } });
  }

  changeExample2Description = (event) => {
    this.setState({ example2: { ...this.state.example2, description: event.target.value } });
  }

  render() {
    // Rise the popovers above GuidePageSideNav
    const popoverStyle = { zIndex: '200' };

    return (
      <KuiFieldGroup>
        <KuiFieldGroupSection>
          <KuiPopover
            button={(
              <KuiExpressionButton
                description="when"
                buttonValue={this.state.example1.value}
                isActive={this.state.example1.isOpen}
                onClick={this.openExample1}
              />
            )}
            isOpen={this.state.example1.isOpen}
            closePopover={this.closeExample1}
            panelPaddingSize="none"
            withTitle
          >
            {this.getPopover1(popoverStyle)}
          </KuiPopover>
        </KuiFieldGroupSection>

        <KuiFieldGroupSection>
          <KuiPopover
            button={(
              <KuiExpressionButton
                description={this.state.example2.description}
                buttonValue={this.state.example2.value}
                isActive={this.state.example2.isOpen}
                onClick={this.openExample2}
              />
            )}
            isOpen={this.state.example2.isOpen}
            closePopover={this.closeExample2}
            panelPaddingSize="none"
            withTitle
            anchorPosition="left"
          >
            {this.getPopover2(popoverStyle)}
          </KuiPopover>
        </KuiFieldGroupSection>
      </KuiFieldGroup>
    );
  }

  getPopover1(popoverStyle) {
    return (
      <div style={popoverStyle}>
        <KuiPopoverTitle>When</KuiPopoverTitle>
        <KuiExpression>
          <select
            className="kuiSelect"
            value={this.state.example1.value}
            onChange={this.changeExample1}
          >
            <option label="count()">count()</option>
            <option label="average()">average()</option>
            <option label="sum()">sum()</option>
            <option label="median()">median()</option>
            <option label="min()">min()</option>
            <option label="max()">max()</option>
          </select>
        </KuiExpression>
      </div>
    );
  }

  getPopover2(popoverStyle) {
    return (
      <div style={popoverStyle}>
        <KuiPopoverTitle>{this.state.example2.description}</KuiPopoverTitle>
        <KuiExpression>
          <select
            className="kuiSelect"
            value={this.state.example2.object}
            onChange={this.changeExample2Object}
          >
            <option label="A">A</option>
            <option label="B">B</option>
            <option label="C">C</option>
          </select>

          <input
            type="text"
            className="kuiTextInput kuiTextInput--small"
            value={this.state.example2.value}
            onChange={this.changeExample2Value}
          />

          <select
            className="kuiSelect kuiSelect--large"
            value={this.state.example2.description}
            onChange={this.changeExample2Description}
          >
            <option label="Is above">Is above</option>
            <option label="Is below">Is below</option>
            <option label="Is exactly">Is exactly</option>
          </select>
        </KuiExpression>
      </div>
    );
  }
}

KuiExpressionItemExample.propTypes = {
  defaultActiveButton: PropTypes.string.isRequired
};

export default KuiExpressionItemExample;

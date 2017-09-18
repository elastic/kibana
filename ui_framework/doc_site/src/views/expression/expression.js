import React, { PropTypes } from 'react';
import {
  KuiExpressionItem,
  KuiExpressionItemButton,
  KuiExpressionItemPopover,
} from '../../../../components';


class KuiExpressionItemExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      example1: {
        value: 'count()'
      },
      example2: {
        object: 'A',
        value: '100',
        description: 'Is above'
      },
      activeButton: props.defaultActiveButton
    };
  }

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

  onOutsideClick = () => {
    this.setState({ activeButton:null });
  }

  render() {
    //Rise the popovers above GuidePageSideNav
    const popoverStyle = { zIndex:'200' };

    const popover1 = (this.state.activeButton === 'example1') ? this.getPopover1(popoverStyle) : null;
    const popover2 = (this.state.activeButton === 'example2') ? this.getPopover2(popoverStyle) : null;

    return (
      <div>
        <KuiExpressionItem key="example1">
          <KuiExpressionItemButton
            description="when"
            buttonValue={this.state.example1.value}
            isActive={this.state.activeButton === 'example1'}
            onClick={()=>this.setState({ activeButton:'example1' })}
          />
          {popover1}
        </KuiExpressionItem>
        <KuiExpressionItem key="example2">
          <KuiExpressionItemButton
            description={this.state.example2.description}
            buttonValue={this.state.example2.value}
            isActive={this.state.activeButton === 'example2'}
            onClick={()=>this.setState({ activeButton:'example2' })}
          />
          {popover2}
        </KuiExpressionItem>
      </div>
    );
  }

  getPopover1(popoverStyle) {
    return (
      <KuiExpressionItemPopover
        title="When"
        onOutsideClick={this.onOutsideClick}
        style={popoverStyle}
      >
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
      </KuiExpressionItemPopover>
    );
  }

  getPopover2(popoverStyle) {
    return (
      <KuiExpressionItemPopover
        title={this.state.example2.description}
        onOutsideClick={this.onOutsideClick}
        align="right"
        style={popoverStyle}
      >
        <div>
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
        </div>
      </KuiExpressionItemPopover>
    );
  }
}

KuiExpressionItemExample.propTypes = {
  defaultActiveButton: PropTypes.string.isRequired
};

export default KuiExpressionItemExample;

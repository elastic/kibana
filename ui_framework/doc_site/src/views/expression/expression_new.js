import React from 'react';
import _ from 'lodash';

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
      activeButton: null
    };

    this.changeExample1 = this.changeExample1.bind(this);
    this.changeExample2Object = this.changeExample2Object.bind(this);
    this.changeExample2Description = this.changeExample2Description.bind(this);
    this.changeExample2Value = this.changeExample2Value.bind(this);
    this.onOutsideClick = this.onOutsideClick.bind(this);
  }

  changeExample1(event) {
    this.setState(_.merge(this.state,{ example1:{ value: event.target.value } }));
  }

  changeExample2Object(event) {
    this.setState(_.merge(this.state,{ example2:{ object: event.target.value } }));
  }

  changeExample2Value(event) {
    this.setState(_.merge(this.state,{ example2:{ value: event.target.value } }));
  }

  changeExample2Description(event) {
    this.setState(_.merge(this.state,{ example2:{ description: event.target.value } }));
  }

  onOutsideClick() {
    this.setState({ activeButton:null });
  }

  render() {
    const example1PopoverContent = (
      <select className="kuiSelect" value={this.state.example1.value} onChange={this.changeExample1}>
        <option label="count()">count()</option>
        <option label="average()">average()</option>
        <option label="sum()">sum()</option>
        <option label="median()">median()</option>
        <option label="min()">min()</option>
        <option label="max()">max()</option>
      </select>
    );
    const example2PopoverContent = (
      <div>
        <select className="kuiSelect" value={this.state.example2.object} onChange={this.changeExample2Object}>
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

        <select className="kuiSelect kuiSelect--large" value={this.state.example2.description} onChange={this.changeExample2Description}>
          <option label="Is above">Is above</option>
          <option label="Is below">Is below</option>
          <option label="Is exactly">Is exactly</option>
        </select>
      </div>
    );

    //Rise the popovers above GuidePageSideNav
    const popoverStyle = { zIndex:'200' };

    return (
      <div>
        <KuiExpressionItem key='example1'>
          <KuiExpressionItemButton
            description='when'
            value={this.state.example1.value}
            isActive={this.state.activeButton === 'example1'}
            onClick={()=>this.setState({ activeButton:'example1' })}
          />
          <KuiExpressionItemPopover
            title='When'
            isVisible={this.state.activeButton === 'example1'}
            onOutsideClick={this.onOutsideClick}
            style={popoverStyle}
          >
            {example1PopoverContent}
          </KuiExpressionItemPopover>
        </KuiExpressionItem>
        <KuiExpressionItem key='example2'>
          <KuiExpressionItemButton
            description={this.state.example2.description}
            value={this.state.example2.value}
            isActive={this.state.activeButton === 'example2'}
            onClick={()=>this.setState({ activeButton:'example2' })}
          />
          <KuiExpressionItemPopover
            title={this.state.example2.description}
            isVisible={this.state.activeButton === 'example2'}
            onOutsideClick={this.onOutsideClick}
            align='right'
            style={popoverStyle}
          >
            {example2PopoverContent}
          </KuiExpressionItemPopover>
        </KuiExpressionItem>
      </div>
    );
  }
}

export default KuiExpressionItemExample;

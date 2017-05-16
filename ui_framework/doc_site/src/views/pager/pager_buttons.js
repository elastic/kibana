import React from 'react';

import {
  KuiButton,
  KuiPagerButtonGroup
} from '../../../../components';

export class PagerButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      item: 1,
      maxItems: 3
    };
  }

  getPage() {
    switch (this.state.item) {
      case 1:
        return <div>I'm Page 1!</div>;
      case 2:
        return <KuiButton>I'm a button</KuiButton>;
      case 3:
        return <div>You are at the end</div>;
    }
  }

  hasNext = () => this.state.item < this.state.maxItems;
  hasPrevious = () => this.state.item > 1;
  onNext = () => this.setState({ item: this.state.item + 1 });
  onPrevious = () => this.setState({ item: this.state.item - 1 });

  render() {
    return (
      <div>
        <KuiPagerButtonGroup
          hasNext={this.hasNext()}
          hasPrevious={this.hasPrevious()}
          onNext={this.onNext}
          onPrevious={this.onPrevious}
        />
        { this.getPage() }
      </div>
    );
  }
}

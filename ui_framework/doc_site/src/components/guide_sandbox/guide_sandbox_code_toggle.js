import React, {
  Component,
  PropTypes,
} from 'react';

export class GuideSandboxCodeToggle extends Component {
  constructor(props) {
    super(props);
    this.onClickSource = this.onClickSource.bind(this);
  }

  onClickSource() {
    this.props.openCodeViewer(this.props.source, this.props.title);
  }

  render() {
    return (
      <button
        className="guideSandboxCodeToggle guideSection__sourceButton"
        onClick={this.onClickSource}
      >
        <span className="fa fa-code"></span>
      </button>
    );
  }
}

GuideSandboxCodeToggle.propTypes = {
  source: PropTypes.array,
  title: PropTypes.string,
  openCodeViewer: PropTypes.func,
};

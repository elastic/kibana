import React, {
  Component,
  PropTypes,
} from 'react';

export class GuidePageSideNavItem extends Component {

  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.onClick(this.props.id);
  }

  render() {
    return (
      <div className="guidePageSideNavMenu__item">
        <div
          className="guidePageSideNavMenu__itemLink"
          onClick={this.onClick}
        >
          {this.props.children}
        </div>
      </div>
    );
  }

}

GuidePageSideNavItem.propTypes = {
  id: PropTypes.string,
  children: PropTypes.any,
  onClick: PropTypes.func,
};

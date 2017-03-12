import React, {
  Component,
  PropTypes,
} from 'react';

export class GuidePageSideNav extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="guidePageSideNav">
        <div className="guidePageSideNav__title">
          {this.props.title}
        </div>

        <div className="guidePageSideNavMenu">
          {this.props.children}
        </div>
      </div>
    );
  }

}

GuidePageSideNav.propTypes = {
  title: PropTypes.string,
  children: PropTypes.any,
};

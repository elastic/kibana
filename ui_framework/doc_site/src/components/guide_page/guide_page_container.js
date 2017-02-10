import { connect } from 'react-redux';
import { GuidePage } from './guide_page.jsx';

function mapStateToProps(state, ownProps) {
  return Object.assign({}, ownProps, {
    sections: state.sections.sections,
  });
}

export const GuidePageContainer = connect(mapStateToProps)(GuidePage);

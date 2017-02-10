import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { GuideSection } from './guide_section.jsx';

import {
  openCodeViewer,
  registerSection,
  unregisterSection,
} from '../../actions';

function mapStateToProps(state, ownProps) {
  return ownProps;
}

function mapDispatchToProps(dispatch) {
  const actions = {
    openCodeViewer,
    registerSection,
    unregisterSection,
  };

  return bindActionCreators(actions, dispatch);
}

export const GuideSectionContainer = connect(mapStateToProps, mapDispatchToProps)(GuideSection);

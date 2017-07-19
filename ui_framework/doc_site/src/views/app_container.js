import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import {
  getIsCodeViewerOpen,
  getSections,
  getSource,
  getTitle,
} from '../store';
import { AppView } from './app_view';
import {
  openCodeViewer,
  closeCodeViewer,
  registerSection,
  unregisterSection,
} from '../actions';

function mapStateToProps(state, ownProps) {
  return {
    routes: ownProps.routes,
    isCodeViewerOpen: getIsCodeViewerOpen(state),
    source: getSource(state),
    title: getTitle(state),
    sections: getSections(state),
  };
}

function mapDispatchToProps(dispatch) {
  const actions = {
    openCodeViewer,
    closeCodeViewer,
    registerSection,
    unregisterSection,
  };

  return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AppView);


import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import AppView from './app_view.jsx';

import {
  CodeViewerActions,
} from '../actions';

function mapStateToProps(state, ownProps) {
  return {
    routes: ownProps.routes,
    isCodeViewerOpen: state.codeViewer.isOpen,
    code: state.codeViewer.code,
  };
}

function mapDispatchToProps(dispatch) {
  const actions = {
    openCodeViewer: CodeViewerActions.openCodeViewer,
    updateCodeViewer: CodeViewerActions.updateCodeViewer,
    closeCodeViewer: CodeViewerActions.closeCodeViewer,
    registerCode: CodeViewerActions.registerCode,
    unregisterCode: CodeViewerActions.unregisterCode,
  };

  return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AppView);

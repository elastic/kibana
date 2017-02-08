import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import AppView from './app_view.jsx';

import {
  CodeViewerActions,
  ExampleNavActions,
} from '../actions';

function mapStateToProps(state, ownProps) {
  return {
    routes: ownProps.routes,
    isCodeViewerOpen: state.codeViewer.isOpen,
    source: state.codeViewer.source,
    sections: state.sections.sections,
  };
}

function mapDispatchToProps(dispatch) {
  const actions = {
    openCodeViewer: CodeViewerActions.openCodeViewer,
    closeCodeViewer: CodeViewerActions.closeCodeViewer,
    registerSection: ExampleNavActions.registerSection,
    unregisterSection: ExampleNavActions.unregisterSection,
  };

  return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AppView);

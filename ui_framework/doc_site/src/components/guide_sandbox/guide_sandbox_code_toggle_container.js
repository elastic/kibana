import { connect } from 'react-redux';

import { GuideSandboxCodeToggle } from './guide_sandbox_code_toggle';
import {
  openCodeViewer,
} from '../../actions';

export const GuideSandboxCodeToggleContainer = connect(
  null,
  {
    openCodeViewer,
  },
)(GuideSandboxCodeToggle);

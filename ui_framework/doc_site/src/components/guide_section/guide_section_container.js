import { connect } from 'react-redux';

import { GuideSection } from './guide_section.jsx';
import {
  openCodeViewer,
  registerSection,
  unregisterSection,
} from '../../actions';

export const GuideSectionContainer = connect(
  null,
  {
    openCodeViewer,
    registerSection,
    unregisterSection,
  },
)(GuideSection);

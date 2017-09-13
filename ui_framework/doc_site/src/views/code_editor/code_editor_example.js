import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import CodeEditor from './code_editor';
const codeEditorSource = require('!!raw!./code_editor');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Code Editor"
      source={[{
        type: GuideSectionTypes.JS,
        code: codeEditorSource,
      }]}
    >
      <GuideText>
        <p>
          The KuiCodeEditor component is a wrapper around <code>react-ace</code> (which
          itself wraps the ACE code editor), that adds an accessible keyboard mode
          to it. You should always use this component instead of <code>AceReact</code>.
        </p>
        <p>
          All parameters, that you specify are passed down to the
          underlying <code>AceReact</code> component.
        </p>
      </GuideText>

      <GuideDemo>
        <CodeEditor />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

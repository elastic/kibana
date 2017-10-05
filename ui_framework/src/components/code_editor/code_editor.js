import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import AceEditor from 'react-ace';

import { htmlIdGenerator, keyCodes } from '../../../services';

export class KuiCodeEditor extends Component {

  state = {
    isHintActive: true
  };

  idGenerator = htmlIdGenerator();

  aceEditorRef = (aceEditor) => {
    if (aceEditor) {
      this.aceEditor = aceEditor;
      aceEditor.editor.textInput.getElement().tabIndex = -1;
      aceEditor.editor.textInput.getElement().addEventListener('keydown', this.onKeydownAce);
    }
  };

  onKeydownAce = (ev) => {
    if (ev.keyCode === keyCodes.ESCAPE) {
      ev.preventDefault();
      ev.stopPropagation();
      this.stopEditing();
      this.editorHint.focus();
    }
  }

  onBlurAce = (...args) => {
    this.stopEditing();
    if (this.props.onBlur) {
      this.props.onBlur(...args);
    }
  };

  onKeyDownHint = (ev) => {
    if (ev.keyCode === keyCodes.ENTER) {
      ev.preventDefault();
      this.startEditing();
    }
  };

  startEditing = () => {
    this.setState({ isHintActive: false });
    this.aceEditor.editor.textInput.focus();
  }

  stopEditing() {
    this.setState({ isHintActive: true });
  }

  render() {
    const { width, height } = this.props;
    const classes = classNames('kuiCodeEditorKeyboardHint', {
      'kuiCodeEditorKeyboardHint-isInactive': !this.state.isHintActive
    });
    return (
      <div
        className="kuiCodeEditorWrapper"
        style={{ width, height }}
      >
        <div
          className={classes}
          id={this.idGenerator('codeEditor')}
          ref={(hint) => { this.editorHint = hint; }}
          tabIndex="0"
          role="button"
          onClick={this.startEditing}
          onKeyDown={this.onKeyDownHint}
          data-test-subj="codeEditorHint"
        >
          <p className="kuiText kuiVerticalRhythmSmall">
            Press Enter to start editing.
          </p>
          <p className="kuiText kuiVerticalRhythmSmall">
            When you&rsquo;re done, press Escape to stop editing.
          </p>
        </div>
        <AceEditor
          {...this.props}
          ref={this.aceEditorRef}
          onBlur={this.onBlurAce}
        />
      </div>
    );
  }
}

KuiCodeEditor.propTypes = {
  height: PropTypes.string,
  onBlur: PropTypes.func,
  width: PropTypes.string,
};

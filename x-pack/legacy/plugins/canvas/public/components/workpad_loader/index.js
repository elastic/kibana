/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withState, getContext, withHandlers } from 'recompose';
import * as workpadService from '../../lib/workpad_service';
import { notify } from '../../lib/notify';
import { canUserWrite } from '../../state/selectors/app';
import { getWorkpad } from '../../state/selectors/workpad';
import { getId } from '../../lib/get_id';
import { downloadWorkpad } from '../../lib/download_workpad';
import { ComponentStrings, ErrorStrings } from '../../../i18n';
import { WorkpadLoader as Component } from './workpad_loader';

const { WorkpadLoader: strings } = ComponentStrings;
const { WorkpadLoader: errors } = ErrorStrings;

const mapStateToProps = state => ({
  workpadId: getWorkpad(state).id,
  canUserWrite: canUserWrite(state),
});

export const WorkpadLoader = compose(
  getContext({
    router: PropTypes.object,
  }),
  connect(mapStateToProps),
  withState('workpads', 'setWorkpads', null),
  withHandlers({
    // Workpad creation via navigation
    createWorkpad: props => async workpad => {
      // workpad data uploaded, create and load it
      if (workpad != null) {
        try {
          await workpadService.create(workpad);
          props.router.navigateTo('loadWorkpad', { id: workpad.id, page: 1 });
        } catch (err) {
          notify.error(err, { title: errors.getUploadFailureErrorMessage() });
        }
        return;
      }

      props.router.navigateTo('createWorkpad');
    },

    // Workpad search
    findWorkpads: ({ setWorkpads }) => async text => {
      try {
        const workpads = await workpadService.find(text);
        setWorkpads(workpads);
      } catch (err) {
        notify.error(err, { title: errors.getFindFailureErrorMessage() });
      }
    },

    // Workpad import/export methods
    downloadWorkpad: () => workpadId => downloadWorkpad(workpadId),

    // Clone workpad given an id
    cloneWorkpad: props => async workpadId => {
      try {
        const workpad = await workpadService.get(workpadId);
        workpad.name = strings.getClonedWorkpadName(workpad.name);
        workpad.id = getId('workpad');
        await workpadService.create(workpad);
        props.router.navigateTo('loadWorkpad', { id: workpad.id, page: 1 });
      } catch (err) {
        notify.error(err, { title: errors.getCloneFailureErrorMessage() });
      }
    },

    // Remove workpad given an array of id
    removeWorkpads: props => async workpadIds => {
      const { setWorkpads, workpads, workpadId: loadedWorkpad } = props;

      const removeWorkpads = workpadIds.map(id =>
        workpadService
          .remove(id)
          .then(() => ({ id, err: null }))
          .catch(err => ({
            id,
            err,
          }))
      );

      return Promise.all(removeWorkpads).then(results => {
        let redirectHome = false;

        const [passes, errors] = results.reduce(
          ([passes, errors], result) => {
            if (result.id === loadedWorkpad && !result.err) {
              redirectHome = true;
            }

            if (result.err) {
              errors.push(result.id);
            } else {
              passes.push(result.id);
            }

            return [passes, errors];
          },
          [[], []]
        );

        const remainingWorkpads = workpads.workpads.filter(({ id }) => !passes.includes(id));

        const workpadState = {
          total: remainingWorkpads.length,
          workpads: remainingWorkpads,
        };

        if (errors.length > 0) {
          notify.error(errors.getDeleteFailureErrorMessage());
        }

        setWorkpads(workpadState);

        if (redirectHome) {
          props.router.navigateTo('home');
        }

        return errors.map(({ id }) => id);
      });
    },
  })
)(Component);

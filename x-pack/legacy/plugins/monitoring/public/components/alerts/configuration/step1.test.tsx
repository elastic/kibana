/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { omit, pick } from 'lodash';
import '../../../jest.helpers';
import { shallow } from 'enzyme';
import { GetStep1Props } from './step1';
import { EmailActionData } from '../manage_email_action';
import { ALERT_ACTION_TYPE_EMAIL } from '../../../../common/constants';

let Step1: React.FC<GetStep1Props>;
let NEW_ACTION_ID: string;

function setModules() {
  Step1 = require('./step1').Step1;
  NEW_ACTION_ID = require('./configuration').NEW_ACTION_ID;
}

describe('Step1', () => {
  const emailActions = [
    {
      id: '1',
      actionTypeId: '1abc',
      name: 'Testing',
      config: {},
    },
  ];
  const selectedEmailActionId = emailActions[0].id;
  const setSelectedEmailActionId = jest.fn();
  const emailAddress = 'test@test.com';
  const editAction = null;
  const setEditAction = jest.fn();
  const onActionDone = jest.fn();

  const defaultProps: GetStep1Props = {
    onActionDone,
    emailActions,
    selectedEmailActionId,
    setSelectedEmailActionId,
    emailAddress,
    editAction,
    setEditAction,
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      jest.doMock('ui/kfetch', () => ({
        kfetch: () => {
          return {};
        },
      }));
      setModules();
    });
  });

  it('should render normally', () => {
    const component = shallow(<Step1 {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  describe('creating', () => {
    it('should render a create form', () => {
      const customProps = {
        emailActions: [],
        selectedEmailActionId: NEW_ACTION_ID,
      };

      const component = shallow(<Step1 {...defaultProps} {...customProps} />);

      expect(component).toMatchSnapshot();
    });

    it('should render the select box if at least one action exists', () => {
      const customProps = {
        emailActions: [
          {
            id: 'foo',
            actionTypeId: '.email',
            name: '',
            config: {},
          },
        ],
        selectedEmailActionId: NEW_ACTION_ID,
      };

      const component = shallow(<Step1 {...defaultProps} {...customProps} />);
      expect(component.find('EuiSuperSelect').exists()).toBe(true);
    });

    it('should send up the create to the server', async () => {
      const kfetch = jest.fn().mockImplementation(() => {});
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch,
        }));
        setModules();
      });

      const customProps = {
        emailActions: [],
        selectedEmailActionId: NEW_ACTION_ID,
      };

      const component = shallow(<Step1 {...defaultProps} {...customProps} />);

      const data: EmailActionData = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        from: 'test@test.com',
        user: 'user@user.com',
        password: 'password',
      };

      const createEmailAction: (data: EmailActionData) => void = component
        .find('ManageEmailAction')
        .prop('createEmailAction');
      createEmailAction(data);

      expect(kfetch).toHaveBeenCalledWith({
        method: 'POST',
        pathname: `/api/action`,
        body: JSON.stringify({
          name: 'Email action for Stack Monitoring alerts',
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    });
  });

  describe('editing', () => {
    it('should allow for editing', () => {
      const customProps = {
        editAction: emailActions[0],
      };

      const component = shallow(<Step1 {...defaultProps} {...customProps} />);

      expect(component).toMatchSnapshot();
    });

    it('should send up the edit to the server', async () => {
      const kfetch = jest.fn().mockImplementation(() => {});
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch,
        }));
        setModules();
      });

      const customProps = {
        editAction: emailActions[0],
      };

      const component = shallow(<Step1 {...defaultProps} {...customProps} />);

      const data: EmailActionData = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        from: 'test@test.com',
        user: 'user@user.com',
        password: 'password',
      };

      const createEmailAction: (data: EmailActionData) => void = component
        .find('ManageEmailAction')
        .prop('createEmailAction');
      createEmailAction(data);

      expect(kfetch).toHaveBeenCalledWith({
        method: 'PUT',
        pathname: `/api/action/${emailActions[0].id}`,
        body: JSON.stringify({
          name: emailActions[0].name,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    });
  });

  describe('testing', () => {
    it('should allow for testing', async () => {
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch: jest.fn().mockImplementation(arg => {
            if (arg.pathname === '/api/action/1/_execute') {
              return { status: 'ok' };
            }
            return {};
          }),
        }));
        setModules();
      });

      const component = shallow(<Step1 {...defaultProps} />);

      expect(
        component
          .find('EuiButton')
          .at(1)
          .prop('isLoading')
      ).toBe(false);
      component
        .find('EuiButton')
        .at(1)
        .simulate('click');
      expect(
        component
          .find('EuiButton')
          .at(1)
          .prop('isLoading')
      ).toBe(true);
      await component.update();
      expect(
        component
          .find('EuiButton')
          .at(1)
          .prop('isLoading')
      ).toBe(false);
    });

    it('should show a successful test', async () => {
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch: (arg: any) => {
            if (arg.pathname === '/api/action/1/_execute') {
              return { status: 'ok' };
            }
            return {};
          },
        }));
        setModules();
      });

      const component = shallow(<Step1 {...defaultProps} />);

      component
        .find('EuiButton')
        .at(1)
        .simulate('click');
      await component.update();
      expect(component).toMatchSnapshot();
    });

    it('should show a failed test error', async () => {
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch: (arg: any) => {
            if (arg.pathname === '/api/action/1/_execute') {
              return { message: 'Very detailed error message' };
            }
            return {};
          },
        }));
        setModules();
      });

      const component = shallow(<Step1 {...defaultProps} />);

      component
        .find('EuiButton')
        .at(1)
        .simulate('click');
      await component.update();
      expect(component).toMatchSnapshot();
    });

    it('should not allow testing if there is no email address', () => {
      const customProps = {
        emailAddress: '',
      };
      const component = shallow(<Step1 {...defaultProps} {...customProps} />);
      expect(
        component
          .find('EuiButton')
          .at(1)
          .prop('isDisabled')
      ).toBe(true);
    });

    it('should should a tooltip if there is no email address', () => {
      const customProps = {
        emailAddress: '',
      };
      const component = shallow(<Step1 {...defaultProps} {...customProps} />);
      expect(component.find('EuiToolTip')).toMatchSnapshot();
    });
  });

  describe('deleting', () => {
    it('should send up the delete to the server', async () => {
      const kfetch = jest.fn().mockImplementation(() => {});
      jest.isolateModules(() => {
        jest.doMock('ui/kfetch', () => ({
          kfetch,
        }));
        setModules();
      });

      const customProps = {
        setSelectedEmailActionId: jest.fn(),
        onActionDone: jest.fn(),
      };
      const component = shallow(<Step1 {...defaultProps} {...customProps} />);

      await component
        .find('EuiButton')
        .at(2)
        .simulate('click');
      await component.update();

      expect(kfetch).toHaveBeenCalledWith({
        method: 'DELETE',
        pathname: `/api/action/${emailActions[0].id}`,
      });

      expect(customProps.setSelectedEmailActionId).toHaveBeenCalledWith('');
      expect(customProps.onActionDone).toHaveBeenCalled();
      expect(
        component
          .find('EuiButton')
          .at(2)
          .prop('isLoading')
      ).toBe(false);
    });
  });
});

import axios from 'axios';
import inquirer from 'inquirer';
import { commitsWithPullRequestsMock } from '../unit/services/github/mocks/commitsByAuthorMock';
import os from 'os';
import childProcess = require('child_process');
import {
  HOMEDIR_PATH,
  REMOTE_ORIGIN_REPO_PATH,
  REMOTE_FORK_REPO_PATH
} from './envConstants';

const unmockedExec = childProcess.exec;

export function createSpies({ commitCount }: { commitCount: number }) {
  // set alternative homedir
  jest.spyOn(os, 'homedir').mockReturnValue(HOMEDIR_PATH);

  // proxy exec calls and make a few modifications
  jest.spyOn(childProcess, 'exec').mockImplementation((cmd, options, cb) => {
    const nextCmd = cmd
      .replace(
        'https://myAccessToken@github.com/elastic/backport-demo.git',
        REMOTE_ORIGIN_REPO_PATH
      )
      .replace(
        'https://myAccessToken@github.com/sqren/backport-demo.git',
        REMOTE_FORK_REPO_PATH
      );

    return unmockedExec(nextCmd, options, cb);
  });

  // mock verifyAccessToken
  jest.spyOn(axios, 'head').mockReturnValueOnce(true as any);

  // mock axios post request (graphql)
  const axiosPostSpy = jest
    .spyOn(axios, 'post')

    // mock author id
    .mockReturnValueOnce({
      data: {
        data: {
          user: {
            id: 'sqren_author_id'
          }
        }
      }
    } as any)

    // mock list of commits
    .mockReturnValueOnce({
      data: {
        data: commitsWithPullRequestsMock
      }
    } as any)

    // mock create pull request
    .mockReturnValueOnce({
      data: {
        html_url: 'pull request url',
        number: 1337
      }
    } as any);

  // mock prompt
  jest
    .spyOn(inquirer, 'prompt')
    // @ts-ignore
    .mockImplementationOnce(async (args: any) => {
      return {
        promptResult:
          commitCount === 2
            ? [args[0].choices[0].value, args[0].choices[1].value]
            : args[0].choices[1].value
      };
    })
    .mockImplementationOnce(async (args: any) => {
      return { promptResult: args[0].choices[0].name };
    });

  return { axiosPostSpy };
}

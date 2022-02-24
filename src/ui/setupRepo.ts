import del = require('del');
import { ValidConfigOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { getRepoPath } from '../services/env';
import {
  addRemote,
  cloneRepo,
  deleteRemote,
  getGitProjectRootPath,
  getLocalRepoPath,
  getRemoteUrl,
} from '../services/git';
import { ora } from './ora';

export async function setupRepo(options: ValidConfigOptions) {
  const repoPath = getRepoPath(options);
  const isAlreadyCloned = await getIsRepoCloned(options);

  if (options.cwd.includes(repoPath)) {
    throw new HandledError(
      `Refusing to clone repo into "${repoPath}" when current working directory is "${options.cwd}". Please change backport directory via \`--dir\` option or run backport from another location`
    );
  }

  // clone repo if folder does not already exists
  if (!isAlreadyCloned) {
    const spinner = ora(options.ci).start();
    try {
      const localRepoPath = await getLocalRepoPath(options);
      const remoteRepoPath = getRemoteUrl(options, options.repoOwner);
      const sourcePath = localRepoPath ? localRepoPath : remoteRepoPath;

      // show the full path for local repos, but only the host name for remote repos (to avoid showing the access token)
      const sourcePathHumanReadable = !localRepoPath
        ? options.gitHostname
        : sourcePath;

      const spinnerCloneText = `Cloning repository from ${sourcePathHumanReadable} (one-time operation)`;
      spinner.text = `0% ${spinnerCloneText}`;

      await del(repoPath, { force: true });

      await cloneRepo(
        { sourcePath, targetPath: repoPath },
        (progress: number) => {
          spinner.text = `${progress}% ${spinnerCloneText}`;
        }
      );

      spinner.succeed(`100% ${spinnerCloneText}`);
    } catch (e) {
      spinner.fail();
      await del(repoPath, { force: true });
      throw e;
    }
  }

  // delete default "origin" remote to avoid confusion
  await deleteRemote(options, 'origin');

  // ensure remote are setup with latest accessToken
  await deleteRemote(options, options.repoForkOwner);
  await addRemote(options, options.repoForkOwner);

  // add remote for non-fork repo (if the above is a fork)
  if (options.repoForkOwner !== options.repoOwner) {
    await deleteRemote(options, options.repoOwner);
    await addRemote(options, options.repoOwner);
  }
}

async function getIsRepoCloned(options: ValidConfigOptions): Promise<boolean> {
  const repoPath = getRepoPath(options);
  const projectRoot = await getGitProjectRootPath(repoPath);
  return repoPath === projectRoot;
}

import SimpleGit from 'simple-git';
import { promisify } from 'bluebird';

export default function filesToCommit(path) {
  const simpleGit = new SimpleGit(path);
  const gitDiff = promisify(simpleGit.diff, simpleGit);

  return gitDiff(['--name-status', '--cached'])
  .then(output => {
    return output
    .split('\n')
    .map(line => line.trim().split('\t'))
    .filter(parts => parts.length === 2)
    .map(parts => {
      const status = parts.shift();
      const name = parts.join('\t').trim();
      return { status, name };
    });
  });
}

export function getFilename(file) {
  return file.name;
}

export function isAdded(file) {
  return file.status === 'A';
}

export function isDeleted(file) {
  return file.status === 'D';
}

export function isUnmerged(file) {
  return file.status === 'U';
}

export function isStaged(file) {
  return !isDeleted(file) && !isUnmerged(file);
}

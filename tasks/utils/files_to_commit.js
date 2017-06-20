import SimpleGit from 'simple-git';
import { promisify } from 'bluebird';

export default function filesToCommit(path) {
  const simpleGit = new SimpleGit(path);
  const gitDiff = promisify(simpleGit.diff, simpleGit);

  return gitDiff(['--name-status', '--cached'])
  .then(output => {
    return output
    .split('\n')
    .filter(line => line.trim().length > 0) // Ignore blank lines
    .map(line => line.trim().split('\t'))
    .map(parts => {
      const status = parts[0];
      // If a file's been edited, it will only have 2 elements. If it's been renamed it will have
      // 3 elements. But in both cases, the last element is the current name of the file.
      const name = parts[parts.length - 1];
      return { status, name };
    })
    .filter(file => file.status !== 'D'); // Ignore deleted files
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

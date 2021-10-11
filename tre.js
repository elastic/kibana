/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { exec } = require('child_process');

exec(`echo "The \\$HOME variable is $HOME"`).stdout.pipe(process.stdout);
const msg = 'yo';
exec(`echo "${msg}"`).stdout.pipe(process.stdout);
const HOME = 'YO YO YO';
exec(`echo "${HOME}"`).stdout.pipe(process.stdout);
exec(`echo "stdout to stderr"`).stdout.pipe(process.stderr)
exec(`echo "stderr to stdout"`).stderr.pipe(process.stdout)

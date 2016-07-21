#!/usr/bin/env bash

echo "4.1 does not have selenium based tests."
stubScreenshot="test/screenshots/no-screenshots.png"
mkdir -p "$(dirname $stubScreenshot)"
touch "$stubScreenshot"

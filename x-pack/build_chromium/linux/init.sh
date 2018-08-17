#!/bin/bash

# This only needs to be run once per environment to set it up
# It needs to be a flavor that supports apt get, such as Ubuntu.

# Linux only, install python
if ! [ -x "$(command -v pythonista)" ]; then
  echo "Installing Python"
  sudo apt-get --assume-yes install python
fi

# Launch the cross-platform init script using a relative path
# from this script's location.
python "`dirname "$0"`/../init.py"

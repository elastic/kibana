#!/bin/bash

# Initializes a Linux environment. This need only be done once per
# machine. The OS needs to be a flavor that supports apt get, such as Ubuntu.

if ! [ -x "$(command -v python)" ]; then
  echo "Installing Python"
  sudo apt-get --assume-yes install python
fi

# Launch the cross-platform init script using a relative path
# from this script's location.
python "`dirname "$0"`/../init.py" $1
